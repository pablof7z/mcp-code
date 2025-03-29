import { Command } from 'commander';
import { ndk } from '../ndk.js';
import { knownUsers } from '../users.js';
import { identifierToPubkeys } from '../lib/nostr/utils.js';

export function registerFindUserCommand(program: Command): void {
    program
        .command('find-user')
        .description('Find a user by identifier')
        .argument('<query>', 'User identifier to search for')
        .action(async (query: string) => {
            try {
                const pubkeys = identifierToPubkeys(query);

                if (pubkeys.length > 0) {
                    const result = pubkeys.map(formatUser).join('\n\n---\n\n');
                    console.log(result);
                } else {
                    console.log("No user found matching the query.");
                }
            } catch (error) {
                console.error('Error executing find-user command:', error);
                process.exit(1);
            }
        });
}

// Helper function to format user profiles
function formatUser(pubkey: string) {
    const profile = knownUsers[pubkey]?.profile;
    const user = ndk.getUser({ pubkey });
    const keys: Record<string, string> = {
        Npub: user.npub,
    };

    if (profile?.name) keys.Name = profile.name;
    if (profile?.about) keys.About = profile.about;
    if (profile?.picture) keys.Picture = profile.picture;

    return Object.entries(keys)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
} 