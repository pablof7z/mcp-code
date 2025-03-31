import { z } from "zod";
import type { CodeSnippet, FindSnippetsParams } from "../lib/types/index.js";
import { getSnippets } from "../lib/nostr/snippets.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toMetadataString } from "../lib/converters/index.js";

/**
 * List snippets with metadata
 * @param params Parameters to filter snippets
 * @returns List of snippet metadata
 */
export async function listSnippets(
    params: FindSnippetsParams = {}
): Promise<{ content: Array<{ type: "text", text: string }> }> {
    try {
        const result = await getSnippets(params);
        let list = result.snippets
            .map(toMetadataString)
            .join("\n\n------------------\n\n");
        const extra = result.otherSnippets
            .map(toMetadataString)
            .join("\n\n------------------\n\n");

        // Include partial matches if they exist
        if (result.otherSnippets.length > 0) {
            list += "\n\nSome other events not included in this result since they had less in common with your search, here is a list of the events that had partial matches:\n\n";
            list += extra;
        }

        if (list.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No snippets found",
                    },
                ],
            };
        }

        return {
            content: [
                {
                    type: "text",
                    text: list,
                },
            ],
        };
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to list snippets: ${errorMessage}`);
    }
}

export function addListSnippetsCommand(server: McpServer) {
    server.tool(
        "list_snippets",
        "List code snippets metadata (without code content) with filtering by language and tags. Use this to get a large list of available code snippets.",
        {
            since: z
                .number()
                .optional()
                .describe("Fetch snippets newer than this timestamp"),
            until: z
                .number()
                .optional()
                .describe("Fetch snippets older than this timestamp"),
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
                    "List of tags to filter by, be exhaustive, e.g. [ 'ndk', 'nostr', 'pubkey', 'signer' ], we use OR matches"
                ),
        },
        async (args) => listSnippets(args)
    );
} 