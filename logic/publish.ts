import {
    NDKEvent
} from "@nostr-dev-kit/ndk";
import type { NDKFilter } from "@nostr-dev-kit/ndk";
import { z } from "zod";
import { identifierToPubkeys, getSigner } from "../lib/nostr/utils.js";
import { ndk } from "../ndk.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { knownUsers } from "../users.js";

/**
 * Publish a note to Nostr
 * @param content The content of the note to publish
 * @param username Username to publish as
 * @param obey Array of pubkeys, npubs, or names to wait for replies from
 * @returns Publication results
 */
export async function publishNote(
    content: string,
    username?: string,
    obey?: string[]
): Promise<{ content: Array<{ type: "text", text: string }> }> {
    const userToPublishAs = username ?? "main";

    try {
        // Create the event
        const event = new NDKEvent(ndk, {
            kind: 1,
            content,
            tags: [],
        });

        // Get the appropriate signer based on username
        const signer = await getSigner(userToPublishAs);

        // Sign the event with the selected signer
        await event.sign(signer);

        // Publish the already signed event
        await event.publish();
        const eventId = event.id;

        // If obey parameter exists, wait for replies from the specified users
        if (obey && obey.length > 0) {
            // Convert all identifiers to pubkeys
            const pubkeysToObey: string[] = [];
            for (const identifier of obey) {
                const pubkeys = identifierToPubkeys(identifier);
                if (pubkeys.length > 0) {
                    pubkeysToObey.push(...pubkeys);
                }
            }

            if (pubkeysToObey.length === 0) {
                throw new Error("No valid users found to obey");
            }

            // Set up filter to listen for replies
            const filter: NDKFilter = {
                kinds: [1], // Normal notes
                authors: pubkeysToObey,
                "#e": [eventId], // References to our event
            };

            // Wait for a reply
            return await new Promise((resolve, reject) => {
                // Set a timeout of 5 minutes
                const timeout = setTimeout(
                    () => {
                        sub.stop();
                        reject(new Error("Timed out waiting for reply"));
                    },
                    5 * 60 * 1000
                );

                // Subscribe to replies
                const sub = ndk.subscribe(filter);
                sub.on("event", (replyEvent) => {
                    clearTimeout(timeout);
                    sub.stop();

                    // Format the reply output
                    const npub = replyEvent.author.npub;
                    const name = knownUsers[replyEvent.pubkey]?.profile?.name;
                    const replyFrom = name ? `${name} (${npub})` : npub;
                    resolve({
                        content: [
                            {
                                type: "text",
                                text: `${replyFrom} says:\n\n${replyEvent.content}`,
                            },
                        ],
                    });
                });
            });
        }

        return {
            content: [
                {
                    type: "text",
                    text: `Published to Nostr with ID: ${event.encode()}`,
                },
            ],
        };
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to publish: ${errorMessage}`);
    }
}

export function addPublishCommand(server: McpServer) {
    // Add publish tool
    server.tool(
        "publish",
        "Publish a tweet to Nostr",
        {
            content: z
                .string()
                .describe("The content of the tweet you want to publish"),
            username: z
                .string()
                .optional()
                .describe(
                    "Username to publish as (you can see list_usernames to see available usernames)"
                ),
            obey: z
                .array(z.string())
                .optional()
                .describe(
                    "Array of pubkeys, npubs, or names to wait for replies from"
                ),
        },
        async ({ content, username, obey }, _extra) => {
            return await publishNote(content, username, obey);
        }
    );
}
