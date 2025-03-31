import type { NDKEvent, NDKSigner } from "@nostr-dev-kit/ndk";
import { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { ndk } from "../../ndk.js";
import { getUser } from "../../config.js";
import { toPubkeys, toSnippet } from "../converters/index.js";

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

// Re-export converter functions for backward compatibility
export { toPubkeys as identifierToPubkeys, toSnippet as eventToSnippet };
