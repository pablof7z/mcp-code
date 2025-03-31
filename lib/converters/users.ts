import { ndk } from "../../ndk.js";
import { knownUsers } from "../../users.js";
import { queryUser } from "../../users.js";

/**
 * Converts an identifier (pubkey, npub, or name) to pubkeys
 * @param identifier The identifier to convert
 * @returns Array of pubkeys
 */
export function toPubkeys(identifier: string): string[] {
    // If it's an npub, convert directly
    if (identifier.startsWith("npub")) {
        return [ndk.getUser({ npub: identifier }).pubkey];
    }

    // If it's a hex pubkey, return as is
    if (identifier.length === 64 && /^[0-9a-f]+$/i.test(identifier)) {
        return [identifier];
    }

    // Otherwise, search by profile name or other attributes
    return queryUser(identifier);
}

/**
 * Format user profile data for display
 * @param pubkey User public key
 * @returns Formatted string representation
 */
export function formatUser(pubkey: string): string {
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