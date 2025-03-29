import { z } from "zod";
import { ndk } from "../ndk.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAllUsers } from "../config.js";
import { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";

/**
 * List all available usernames in the system
 * @returns Formatted list of available usernames
 */
export async function listUsernames() {
    try {
        const users = await Promise.all(
            Object.values(getAllUsers()).map(async (user) => {
                const signer = new NDKPrivateKeySigner(user.nsec);
                const npub = (await signer.user()).npub;
                return {
                    name: user.display_name,
                    npub: npub,
                };
            })
        );

        if (users.length === 0) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: "No users found. Try creating a user with the create_pubkey command first.",
                    },
                ],
            };
        }

        const usersList = users
            .map((user) => `${user.name} - ${user.npub}`)
            .join("\n");

        return {
            content: [
                {
                    type: "text" as const,
                    text: `Available users (${users.length}):\n${usersList}`,
                },
            ],
        };
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to list usernames: ${errorMessage}`);
    }
}

export function addListUsernamesCommand(server: McpServer) {
    server.tool(
        "list_usernames",
        "List all available usernames in the system",
        {
            random_string: z
                .string()
                .optional()
                .describe("Dummy parameter for no-parameter tools"),
        },
        async () => {
            return listUsernames();
        }
    );
}
