import { z } from "zod";
import {
    formatPartialMatches,
    formatSnippets,
    getSnippets,
} from "../lib/nostr/snippets.js";
import type { FindSnippetsParams } from "../lib/types/index.js";
import { log } from "../lib/utils/log.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Find code snippets with optional filtering
 * @param params Search parameters for filtering snippets
 * @returns Formatted snippets that match the criteria
 */
export async function findSnippets({
    since,
    until,
    authors,
    languages,
    tags,
}: FindSnippetsParams) {
    try {
        const { snippets, otherSnippets } = await getSnippets({
            limit: 500, // Get more snippets to find the max matches
            since,
            until,
            authors,
            languages,
            tags,
        });

        if (snippets.length === 0) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: "No code snippets found matching the criteria.",
                    },
                ],
            };
        }

        // Format snippets for display
        const formattedSnippets = formatSnippets(snippets);
        const partialMatchesText = formatPartialMatches(otherSnippets);

        return {
            content: [
                {
                    type: "text" as const,
                    text: `Found ${snippets.length} code snippets:\n\n${formattedSnippets}${partialMatchesText}`,
                },
            ],
        };
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to find snippets: ${errorMessage}`);
    }
}

export function addFindSnippetsCommand(server: McpServer) {
    server.tool(
        "find_snippets",
        "Find code snippets with optional filtering by author, language, and tags",
        {
            since: z
                .number()
                .optional()
                .describe("Unix timestamp to fetch snippets from"),
            until: z
                .number()
                .optional()
                .describe("Unix timestamp to fetch snippets until"),
            authors: z
                .array(z.string())
                .optional()
                .describe(
                    "List of author names to filter by (in username format!)"
                ),
            languages: z
                .array(z.string())
                .optional()
                .describe("List of programming languages to filter by"),
            tags: z
                .array(z.string())
                .optional()
                .describe(
                    "List of tags to filter by, be exhaustive, e.g. [ 'ndk', 'nostr', 'pubkey', 'signer' ]"
                ),
        },
        async (args) => findSnippets(args)
    );
}
