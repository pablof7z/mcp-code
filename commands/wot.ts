import { Command } from 'commander';
import { ndk } from '../ndk.js';
import { db } from '../db.js';
import { knownUsers } from '../users.js';
import { getFollowerCount, getFollowing } from '../wot.js';

export function registerWotCommand(program: Command): void {
    program
        .command('wot')
        .description('Get Web of Trust information for a user')
        .argument('<pubkey>', 'Public key or npub of the user')
        .action(async (pubkey: string) => {
            try {
                if (!pubkey) {
                    console.log("Missing pubkey parameter. Usage: wot <pubkey>");
                    process.exit(1);
                }

                // Validate pubkey format (simple check - proper validation would be more complex)
                if (pubkey.length !== 64 && !pubkey.startsWith("npub")) {
                    console.log(
                        "Invalid pubkey format. Please provide a valid hex pubkey or npub."
                    );
                    process.exit(1);
                }

                // Get actual hex pubkey if npub was provided
                let hexPubkey = pubkey;
                if (pubkey.startsWith("npub")) {
                    hexPubkey = ndk.getUser({ npub: pubkey }).pubkey;
                }

                // Get follower count
                const followerCount = getFollowerCount(hexPubkey);

                // Get following count
                const following = getFollowing(hexPubkey);
                const followingCount = following.length;

                // Get profile info if available
                const profile = knownUsers[hexPubkey]?.profile;
                const name = profile?.name || hexPubkey;

                console.log(`Web of Trust for ${name}:`);
                console.log(`Pubkey: ${hexPubkey}`);
                if (ndk.getUser({ pubkey: hexPubkey }).npub) {
                    console.log(`Npub: ${ndk.getUser({ pubkey: hexPubkey }).npub}`);
                }
                console.log(`Followers: ${followerCount}`);
                console.log(`Following: ${followingCount}`);

                // Calculate follow score ratio (simple metric)
                const ratio =
                    followingCount > 0
                        ? (followerCount / followingCount).toFixed(2)
                        : "N/A";
                console.log(`Follower/Following Ratio: ${ratio}`);

                // Most popular followers (if any)
                if (followerCount > 0) {
                    const popularFollowers = db
                        .prepare(`
                        SELECT f.follower, COUNT(*) as count
                        FROM wot f
                        JOIN wot f2 ON f.follower = f2.followed
                        WHERE f.followed = ?
                        GROUP BY f.follower
                        ORDER BY count DESC
                        LIMIT 5
                    `)
                        .all(hexPubkey) as { follower: string; count: number }[];

                    if (popularFollowers.length > 0) {
                        console.log("\nMost influential followers:");
                        for (const follower of popularFollowers) {
                            const followerProfile =
                                knownUsers[follower.follower]?.profile;
                            const followerName =
                                followerProfile?.name ||
                                `${follower.follower.substring(0, 8)}...`;
                            console.log(
                                `- ${followerName} (followed by ${follower.count} users)`
                            );
                        }
                    }
                }
            } catch (error) {
                console.error("Error executing wot command:", error);
                process.exit(1);
            }
        });
} 