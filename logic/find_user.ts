import { z } from "zod";
import { toPubkeys, formatUser } from "../lib/converters/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Find a user by name, npub, or other profile information
 * @param query Search query to find a user
 * @returns Formatted user data or error message
 */
export async function findUser(query: string): Promise<{
    content: Array<{ type: "text"; text: string }>;
}> {
    try {
        // Convert the query to pubkeys
        const pubkeys = toPubkeys(query);

        if (pubkeys.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No users found matching: ${query}`,
                    },
                ],
            };
        }

        // Format user data for each pubkey
        const formattedUsers = pubkeys.map(formatUser).join("\n\n---\n\n");

        return {
            content: [
                {
                    type: "text",
                    text: formattedUsers,
                },
            ],
        };
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error finding user: ${errorMessage}`,
                },
            ],
        };
    }
}

export function addFindUserCommand(server: McpServer) {
    server.tool(
        "find_user",
        "Find a user by name, npub, or other profile information",
        {
            query: z.string().describe("The search query to find a user"),
        },
        async ({ query }) => findUser(query)
    );
}

