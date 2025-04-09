import type { NDKUserProfile } from "@nostr-dev-kit/ndk";
import { db } from "./db.js";
import type { UserEntry } from "./lib/types/index.js";
import { log } from "./lib/utils/log.js";

// Cache for known users to avoid frequent DB queries
export const knownUsers: Record<string, UserEntry> = {};

/**
 * Save a user profile to the database
 * @param pubkey The user's public key
 * @param profile The user's profile information
 * @param data The raw content data
 */
export function saveUserProfile(
    pubkey: string,
    profile: NDKUserProfile,
    data: string
): void {
    // Update the cache
    knownUsers[pubkey] = { profile, data };

    // Save to database
    db.run(
        `INSERT INTO profiles (pubkey, profile, data) 
         VALUES (?, ?, ?)
         ON CONFLICT(pubkey) DO UPDATE SET 
         profile = excluded.profile,
         data = excluded.data,
         updated_at = CURRENT_TIMESTAMP`,
        [pubkey, JSON.stringify(profile), data]
    );
}

/**
 * Save all cached known users to the database
 */
export async function saveKnownUsers(): Promise<void> {
    db.transaction(() => {
        for (const [pubkey, user] of Object.entries(knownUsers)) {
            saveUserProfile(pubkey, user.profile, user.data);
        }
    })();
    log(`Saved ${Object.keys(knownUsers).length} users to database`);
}

/**
 * Load known users from the database into the cache
 */
export async function loadKnownUsers(): Promise<void> {
    const results = db
        .query("SELECT pubkey, profile, data FROM profiles")
        .all() as {
        pubkey: string;
        profile: string;
        data: string;
    }[];

    for (const row of results) {
        try {
            const profile = JSON.parse(row.profile) as NDKUserProfile;
            knownUsers[row.pubkey] = {
                profile,
                data: row.data,
            };
        } catch (err) {
            console.error(`Error parsing profile for ${row.pubkey}:`, err);
        }
    }
    log(`Loaded ${Object.keys(knownUsers).length} users from database`);
}

// Initialize the cache
if (!Object.keys(knownUsers).length) {
    try {
        await loadKnownUsers();
    } catch {}
}

/**
 * Returns the pubkey of users that match the query
 * @param query The search query
 * @returns Array of matching pubkeys
 */
export function queryUser(query: string): string[] {
    const lower = query.toLowerCase();

    // Search in memory cache first
    const cachedResults = Object.entries(knownUsers)
        .filter(([_, u]) => u.data.toLowerCase().includes(lower))
        .map(([pubkey, _]) => pubkey);

    if (cachedResults.length) {
        return cachedResults;
    }

    // Fall back to database search if not found in cache
    const dbResults = db
        .query("SELECT pubkey FROM profiles WHERE data LIKE ?")
        .all(`%${lower}%`) as { pubkey: string }[];

    return dbResults.map((row) => row.pubkey);
}
