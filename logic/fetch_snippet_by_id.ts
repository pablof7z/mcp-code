import { z } from "zod";
import { formatSnippets } from "../lib/converters/index.js";
import { ndk } from "../ndk.js";
import { SNIPPET_KIND } from "../lib/nostr/utils.js";
import { log } from "../lib/utils/log.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toSnippet } from "../lib/converters/index.js";

/**
 * Fetch a snippet by its ID
 * @param id Snippet ID to fetch
 * @returns The snippet content or an error message
 */
export async function fetchSnippetById(id: string): Promise<{
    content: Array<{ type: "text"; text: string }>;
}> {
    try {
        log(`Fetching snippet with ID: ${id}`);

        // Create filter for the specific event ID
        const filter = {
            kinds: [SNIPPET_KIND as number],
            ids: [id],
        };

        // Fetch the event
        const events = await ndk.fetchEvents(filter);
        const event = Array.from(events)[0]; // Get the first (and should be only) event

        if (!event) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No snippet found with ID: ${id}`,
                    },
                ],
            };
        }

        // Convert event to snippet
        const snippet = toSnippet(event);

        // Format the snippet for display
        const formattedSnippet = formatSnippets([snippet]);

        return {
            content: [
                {
                    type: "text",
                    text: formattedSnippet,
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
                    text: `Error fetching snippet: ${errorMessage}`,
                },
            ],
        };
    }
}

export function addFetchSnippetByIdCommand(server: McpServer) {
    server.tool(
        "fetch_snippet_by_id",
        "Fetch and display a snippet by its ID",
        {
            id: z.string().describe("ID of the snippet to fetch"),
        },
        async ({ id }) => fetchSnippetById(id)
    );
} 