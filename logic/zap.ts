import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NDKZapper } from "@nostr-dev-kit/ndk";
import type { CashuPaymentInfo, LnPaymentInfo, NDKEvent, NDKUser, NDKZapDetails } from "@nostr-dev-kit/ndk";
import type { NDKCashuWallet } from "@nostr-dev-kit/ndk-wallet";
import { ndk } from "../ndk.js";
import { getSigner } from "../lib/nostr/utils.js";
import { snippetsCache } from "../lib/cache/snippets.js";
import { getWallet } from "../lib/cache/wallets.js";
import { SNIPPET_KIND } from "../lib/nostr/utils.js";
import { toPubkeys } from "../lib/converters/users.js";
import { log } from "../lib/utils/log.js";

/**
 * Find a snippet by title in the cache
 * @param title The title to search for
 * @returns Matching event ID or null if not found
 */
function findSnippetIdByTitle(title: string): string | null {
    // First search in the cache (case insensitive)
    const normalizedTitle = title.toLowerCase();
    for (const id in snippetsCache) {
        const snippet = snippetsCache[id];
        if (snippet && snippet.title.toLowerCase() === normalizedTitle) {
            return snippet.id;
        }
    }
    return null;
}

/**
 * Send a nutzap to an event, snippet, or user
 * @param amount Amount in sats to send
 * @param recipient Optional recipient (username, npub, or pubkey) to zap directly
 * @param eventId Optional event ID to zap
 * @param title Optional snippet title to look up and zap
 * @param thanks_message Optional thank you message to include with the zap
 * @param username Username to zap from (uses wallet associated with this user)
 * @returns Zap results
 */
export async function sendZap(
    amount: number,
    recipient?: string,
    eventId?: string,
    title?: string,
    thanks_message?: string,
    username?: string
): Promise<{ content: Array<{ type: "text", text: string }> }> {
    const userToZapFrom = username ?? "main";

    try {
        // Get the appropriate signer based on username
        const signer = await getSigner(userToZapFrom);
        
        // Set the signer for this operation
        ndk.signer = signer;
        
        // Get the user's pubkey
        const user = await signer.user();
        const senderPubkey = user.pubkey;

        // Determine what to zap based on provided parameters
        let targetEvent: NDKEvent | undefined;
        let targetUser: NDKUser | undefined;
        let zapTarget: NDKEvent | NDKUser;
        let targetDescription: string;

        // 1. If an event ID is provided, use that
        if (eventId) {
            if (eventId.length === 64 && /^[0-9a-f]+$/i.test(eventId)) {
                const fetchedEvent = await ndk.fetchEvent(eventId);
                if (!fetchedEvent) {
                    throw new Error(`Event not found with ID: ${eventId}`);
                }
                targetEvent = fetchedEvent;
                targetDescription = `event: ${eventId}`;
            } else {
                throw new Error("Invalid event ID format");
            }
        }
        // 2. If a title is provided, look up the matching event
        else if (title) {
            // Try to find in cache first
            const cachedId = findSnippetIdByTitle(title);
            
            if (cachedId) {
                const fetchedEvent = await ndk.fetchEvent(cachedId);
                if (!fetchedEvent) {
                    throw new Error(`Event with cached ID ${cachedId} not found`);
                }
                targetEvent = fetchedEvent;
                targetDescription = `snippet: ${title}`;
            } else {
                // Not in cache, search on the network
                console.log(`Searching for snippet with title: ${title}`);
                
                // Search for events with this title
                const events = await ndk.fetchEvents({
                    kinds: [SNIPPET_KIND as number],
                    limit: 10,
                });
                
                // Find the first event where the title matches
                for (const event of events) {
                    const eventTitle = event.tagValue("title") ?? event.tagValue("name");
                    if (eventTitle && eventTitle.toLowerCase() === title.toLowerCase()) {
                        targetEvent = event;
                        break;
                    }
                }
                
                if (!targetEvent) {
                    throw new Error(`No snippet found with title: ${title}`);
                }
                targetDescription = `snippet: ${title}`;
            }
        }
        // 3. If a recipient is provided, get the user
        else if (recipient) {
            const pubkeys = toPubkeys(recipient);
            if (pubkeys.length === 0) {
                throw new Error(`No user found for identifier: ${recipient}`);
            }
            
            targetUser = ndk.getUser({ pubkey: pubkeys[0] });
            targetDescription = `user: ${recipient} (${pubkeys[0]})`;
        }
        // 4. If none are provided, throw an error
        else {
            throw new Error("Must provide either an event ID, snippet title, or recipient to zap");
        }

        // Set the zap target based on what was provided
        if (targetEvent) {
            zapTarget = targetEvent;
        } else if (targetUser) {
            zapTarget = targetUser;
        } else {
            throw new Error("Failed to determine zap target");
        }

        // Get wallet for this user
        console.log(`Getting wallet for user: ${senderPubkey}`);
        const wallet = await getWallet(senderPubkey, signer);
        
        if (!wallet) {
            throw new Error("No NIP-60 wallet found for this user. Create a wallet first.");
        }

        if (wallet.balance === undefined || wallet.balance.amount < amount) {
            return {
                content: [
                    {
                        type: "text",
                        text: `I don't have enough money, damn, man. I have ${wallet.balance?.amount ?? 0} sats.`,
                    },
                ],
            };
        }
        
        // Send the zap using NDKZapper as explicitly requested
        log(`Sending ${amount} sats zap to ${targetDescription}`);

        ndk.wallet = wallet;
        
        // Create an NDKZapper instance
        // @ts-ignore - NDKZapper constructor signature may differ from types
        const zapper = new NDKZapper(zapTarget, amount * 1000, 'msat', {
            nutzapAsFallback: true,
            comment: thanks_message,
            cashuPay: (payment: NDKZapDetails<CashuPaymentInfo>) => {
                log(`Cashu payment: ${JSON.stringify(payment)}`);
                return wallet.cashuPay(payment);
            },
            lnPay: (payment: NDKZapDetails<LnPaymentInfo>) => {
                log(`LN payment: ${JSON.stringify(payment)}`);
                return wallet.lnPay(payment);
            }
        });
        
        // Send the zap using NDKZapper as explicitly requested
        // @ts-ignore - zap method parameters might differ from types
        const ret = await zapper.zap(['nip61']);
        log('return'+ ret?.id);

        return {
            content: [
                {
                    type: "text",
                    text: `Successfully sent ${amount} sats zap to ${targetDescription}`,
                },
            ],
        };
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to send zap: ${errorMessage}`);
    }
}

export function addZapCommand(server: McpServer) {
    // Add zap tool
    server.tool(
        "zap",
        "Send a nutzap to an event, snippet, or user using a NIP-60 wallet. Specify one of event_id, title, or recipient, no need for all of them.",
        {
            amount: z
                .number()
                .describe("Amount in sats to send"),
            recipient: z
                .string()
                .optional()
                .describe("Recipient (username, npub, or pubkey) to zap directly"),
            event_id: z
                .string()
                .optional()
                .describe("Event ID to zap"),
            title: z
                .string()
                .optional()
                .describe("Snippet title to look up and zap"),
            thanks_message: z
                .string()
                .optional()
                .describe("Optional thank you message to include with the zap"),
            username: z
                .string()
                .optional()
                .describe("Username to zap from (uses wallet associated with this user)"),
        },
        async ({ amount, recipient, event_id, title, thanks_message, username }) => {
            return await sendZap(amount, recipient, event_id, title, thanks_message, username);
        }
    );
}