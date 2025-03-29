import { z } from "zod";
import { ndk } from "../ndk.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { knownUsers } from "../users.js";
import { queryUser } from "../users.js";

/**
 * Find a user by name, npub, or other profile information
 * @param query The search query to find a user
 * @returns Results with formatted user information
 */
export async function findUser(query: string) {
    try {
        const pubkeys = queryUser(query);

        if (pubkeys.length === 0) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: "No users found matching the query.",
                    },
                ],
            };
        }

        // Format the found users for display
        const formattedUsers = pubkeys.map(formatUser).join("\n\n---\n\n");

        return {
            content: [
                {
                    type: "text" as const,
                    text: `Found ${pubkeys.length} users:\n\n${formattedUsers}`,
                },
            ],
        };
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to find user: ${errorMessage}`);
    }
}

export function addFindUserCommand(server: McpServer) {
    server.tool(
        "find_user",
        "Find a user by name, npub, or other profile information",
        {
            query: z.string().describe("The search query to find a user"),
        },
        async ({ query }) => {
            return findUser(query);
        }
    );
}

/**
 * Format user profile data for display
 * @param pubkey User public key
 * @returns Formatted string representation
 */
function formatUser(pubkey: string): string {
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
