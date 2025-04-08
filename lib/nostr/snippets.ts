import type { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { db } from "../../db.js";
import { ndk } from "../../ndk.js";
import type { CodeSnippet, FindSnippetsParams } from "../types/index.js";
import { log } from "../utils/log.js";
import { SNIPPET_KIND, identifierToPubkeys } from "./utils.js";
import { formatPartialMatches, formatSnippets, toSnippet } from "../converters/index.js";

/**
 * Get code snippets from Nostr events of kind 1337
 *
 * @param params - Parameters to filter snippets
 * @returns Array of code snippets
 */
export async function getSnippets(params: FindSnippetsParams = {}): Promise<{
    snippets: CodeSnippet[];
    otherSnippets: CodeSnippet[];
}> {
    // Construct filter based on params
    const filter: NDKFilter = {
        kinds: [SNIPPET_KIND as number],
        limit: params.limit || 500,
    };

    // Add optional filters
    if (params.since) {
        filter.since = params.since;
    }

    if (params.until) {
        filter.until = params.until;
    }

    if (params.authors && params.authors.length > 0) {
        for (const author of params.authors) {
            const pubkeys = identifierToPubkeys(author);
            if (pubkeys.length) {
                filter.authors ??= [];
                filter.authors.push(...pubkeys);
            } else {
                log(`Unknown author: ${author}`);
            }
        }
    }

    // Add custom tag filters for languages and tags
    if (params.languages && params.languages.length > 0) {
        filter["#l"] = params.languages;
    }

    if (params.tags && params.tags.length > 0) {
        filter["#t"] = params.tags;
    }

    log(`Fetching snippets with filter: ${JSON.stringify(filter, null, 2)}`);

    // Fetch events
    const events = await ndk.fetchEvents(filter);

    let maxMatchCount = 0;

    /**
     * Function to calculate the number of tags in an event that match the search tags.
     * Used for ranking snippets based on tag relevance.
     * If no tags are provided in params, all snippets are considered equally relevant (match count = 1).
     */
    function getMatchCount(event: NDKEvent) {
        if (!params.tags || params.tags.length === 0) return 1;

        const aTags = event.tags
            .filter((tag) => tag[0] === "t") // Filter for 't' tags
            .map((tag) => tag[1]) // Get the tag value
            .filter((t): t is string => t !== undefined); // Ensure tag value exists and narrow type

        // Count how many of the searched tags are present in the event's tags
        return params.tags.filter((searchTag) =>
            aTags.some((eventTag) => eventTag.match(new RegExp(searchTag, "i"))) // Case-insensitive tag matching
        ).length;
    }

    for (const event of events) {
        const aMatches = getMatchCount(event);
        if (aMatches > maxMatchCount) maxMatchCount = aMatches;
    }

    const selectedEvents: NDKEvent[] = [];
    const notSelectedEvents: NDKEvent[] = [];

    for (const event of events) {
        if (getMatchCount(event) === maxMatchCount) {
            selectedEvents.push(event);
        } else {
            notSelectedEvents.push(event);
        }
    }

    // Convert events to snippets
    const snippets = selectedEvents.map(toSnippet);
    const otherSnippets = notSelectedEvents.map(toSnippet);


    // --- BEGIN DATABASE INSERTION ---
    const allSnippets = [...snippets, ...otherSnippets];
    if (allSnippets.length > 0) {
        log(`Saving ${allSnippets.length} snippets to the database...`);
        const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO snippets (id, title, description, code, language, pubkey, createdAt, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        try {
            db.transaction(() => {
                for (const snippet of allSnippets) {
                    insertStmt.run(
                        snippet.id,
                        snippet.title,
                        snippet.description,
                        snippet.code,
                        snippet.language,
                        snippet.pubkey,
                        snippet.createdAt,
                        JSON.stringify(snippet.tags) // Store tags as JSON string
                    );
                }
            })(); // Immediately invoke the transaction
            log("Snippets saved successfully.");
        } catch (error) {
            console.error("Failed to save snippets to database:", error);
            // Decide if we should throw or just log the error
            // For now, just log it and continue returning fetched snippets
        }
    }
    // --- END DATABASE INSERTION ---
    return { snippets, otherSnippets };
}

// Re-export formatters for backward compatibility
export { formatSnippets, formatPartialMatches };
