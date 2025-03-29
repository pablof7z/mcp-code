import type { NDKEvent, NDKSigner } from "@nostr-dev-kit/ndk";
import { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { ndk } from "../../ndk.js";
import { queryUser } from "../../users.js";
import type { CodeSnippet } from "../types/index.js";
import { getUser } from "../../config.js";

export const SNIPPET_KIND = 1337;

/**
 * Gets the appropriate signer based on the username
 * @param username Username to get signer for (or "main" for default)
 * @returns The signer to use
 * @throws Error if user not found or missing nsec
 */
export async function getSigner(username?: string): Promise<NDKSigner> {
    // If no username or "main", return the default signer
    if (!username || username === "main") {
        if (!ndk.signer) {
            throw new Error("No default signer configured");
        }
        return ndk.signer;
    }

    // Otherwise, get the user's signer
    const userData = getUser(username);

    if (!userData?.nsec) {
        throw new Error(`User "${username}" not found in config or missing nsec`);
    }

    return new NDKPrivateKeySigner(userData.nsec);
}

/**
 * Converts an identifier (pubkey, npub, or name) to pubkeys
 * @param identifier The identifier to convert
 * @returns Array of pubkeys
 */
export function identifierToPubkeys(identifier: string): string[] {
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
 * Converts an NDKEvent into a CodeSnippet
 * @param event NDKEvent of kind 1337
 * @returns CodeSnippet object
 */
export function eventToSnippet(event: NDKEvent): CodeSnippet {
    const title = event.tagValue("title") ?? event.tagValue("name");
    const language = event.tagValue("l");
    const tags = event.tags
        .filter((tag) => tag[0] === "t" && tag[1] !== undefined)
        .map((tag) => tag[1] as string);

    return {
        id: event.id,
        title: title || "Untitled",
        code: event.content,
        language: language || "text",
        pubkey: event.pubkey,
        createdAt: event.created_at || 0,
        tags,
    };
}
