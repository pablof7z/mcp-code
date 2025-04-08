import NDK, { NDKPrivateKeySigner, NDKUser, NDKEvent } from "@nostr-dev-kit/ndk";
import { NDKCashuWallet } from "@nostr-dev-kit/ndk-wallet";
import { NDKCashuMintList } from "@nostr-dev-kit/ndk";
import { getWallet } from "../lib/cache/wallets.js";
import { z } from "zod";
import { getUser, saveUser } from "../config.js";
import { log } from "../lib/utils/log.js";
import { ndk } from "../ndk.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function createPubkey({
    username,
    display_name,
    about,
}: {
    username: string;
    display_name: string;
    about?: string;
}) {
    try {
        // Check if username already exists
        const existingUser = getUser(username);
        if (existingUser) {
            throw new Error(`Username "${username}" already exists`);
        }

        // Generate a new keypair for this user
        const signer = NDKPrivateKeySigner.generate();

        // Create profile metadata event (kind 0)
        const profileContent = JSON.stringify({
            display_name,
            name: display_name,
            about: about || "",
        });

        // Create the event
        const event = new NDKEvent(ndk, {
            kind: 0,
            content: profileContent,
            tags: [],
        });

        // Sign with the new signer
        await event.sign(signer);

        // Publish the event
        await event.publish();


        // --- Setup Cashu Wallet (NIP-60/NIP-61) ---
        log(`Setting up Cashu wallet for ${username}...`);

        try {
            // Use getWallet to retrieve or create a wallet for the new pubkey
            const wallet = await getWallet(signer.pubkey);
            
            if (wallet) {
                log(`Cashu wallet setup complete for ${username}.`);
                log(` -> P2PK: ${wallet.p2pk}`);
                log(` -> Mints: ${wallet.mints.join(', ')}`);
            } else {
                throw new Error("Failed to create wallet");
            }
        } catch (walletError) {
            console.error(`Failed to set up Cashu wallet for ${username}:`, walletError);
            // Decide if this should be a fatal error for pubkey creation
            // For now, log the error and continue
        }
        // --- End Cashu Wallet Setup ---
        // Save the user to the config
        saveUser(username, {
            nsec: signer.privateKey,
            display_name,
            about: about || "",
        });

        // Create user object for return
        const user = ndk.getUser({ pubkey: signer.pubkey });

        // Return success message
        log(`Created pubkey for ${username} with public key ${signer.pubkey}`);

        return {
            user,
            message: `Created pubkey for ${username} with npub ${user.npub} and a NIP-60 Cashu wallet for nutzaps`,
        };
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create pubkey: ${errorMessage}`);
    }
}

export function addCreatePubkeyCommand(server: McpServer) {
    server.tool(
        "create_pubkey",
        "Create a new keypair and save it to config",
        {
            username: z.string().describe("Username to create"),
            display_name: z.string().describe("Display name for the pubkey"),
            about: z
                .string()
                .optional()
                .describe("About information for this pubkey"),
        },
        async ({ username, display_name, about }) => {
            const result = await createPubkey({
                username,
                display_name,
                about,
            });

            return {
                content: [
                    {
                        type: "text",
                        text: result.message,
                    },
                ],
            };
        }
    );
}
