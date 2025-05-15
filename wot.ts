import { db } from "./db.js";
import type { Database, Statement } from "./types.js";

/**
 * Add follows for a given follower
 * @param follower The pubkey of the follower
 * @param followed Array of pubkeys being followed
 */
export function addFollows(follower: string, followed: string[]): void {
    const stmt = db.prepare(
        "INSERT OR IGNORE INTO wot (follower, followed) VALUES (?, ?)"
    );

    // Use a transaction for better performance
    db.transaction(() => {
        for (const followedPubkey of followed) {
            stmt.run(follower, followedPubkey);
        }
    })();

    // No finalize() needed for better-sqlite3
}

/**
 * Get the count of followers for a given pubkey
 * @param pubkey The pubkey to get follower count for
 * @returns The number of distinct followers
 */
export function getFollowerCount(pubkey: string): number {
    const result = db
        .prepare(
            "SELECT COUNT(DISTINCT follower) as count FROM wot WHERE followed = ?"
        )
        .get(pubkey) as { count: number };

    return result.count;
}

/**
 * Get all followers for a given pubkey
 * @param pubkey The pubkey to get followers for
 * @returns Array of follower pubkeys
 */
export function getFollowers(pubkey: string): string[] {
    const results = db
        .prepare("SELECT DISTINCT follower FROM wot WHERE followed = ?")
        .all(pubkey) as { follower: string }[];

    return results.map((row) => row.follower);
}

/**
 * Get all pubkeys followed by a given pubkey
 * @param pubkey The pubkey to get follows for
 * @returns Array of followed pubkeys
 */
export function getFollowing(pubkey: string): string[] {
    const results = db
        .prepare("SELECT DISTINCT followed FROM wot WHERE follower = ?")
        .all(pubkey) as { followed: string }[];

    return results.map((row) => row.followed);
}

/**
 * Remove a follow relationship
 * @param follower The follower pubkey
 * @param followed The followed pubkey
 */
export function removeFollow(follower: string, followed: string): void {
    db.prepare("DELETE FROM wot WHERE follower = ? AND followed = ?")
        .run(follower, followed);
}
