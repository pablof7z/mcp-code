import type { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { ndk } from "../../ndk.js";
import { knownUsers } from "../../users.js";
import type { CodeSnippet, FindSnippetsParams } from "../types/index.js";
import { log } from "../utils/log.js";
import { SNIPPET_KIND, eventToSnippet, identifierToPubkeys } from "./utils.js";

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

    function getMatchCount(event: NDKEvent) {
        if (!params.tags || params.tags.length === 0) return 1;

        const aTags = event.tags
            .filter((tag) => tag[0] === "t")
            .map((tag) => tag[1])
            .filter((t) => t !== undefined);
        return params.tags.filter((tag) =>
            aTags.some((t) => t.match(new RegExp(tag, "i")))
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
    const snippets = selectedEvents.map(eventToSnippet);
    const otherSnippets = notSelectedEvents.map(eventToSnippet);

    return { snippets, otherSnippets };
}

/**
 * Format snippets for display
 * @param snippets Array of code snippets
 * @returns Formatted string representation
 */
export function formatSnippets(snippets: CodeSnippet[]): string {
    return snippets
        .map((snippet) => {
            const author = knownUsers[snippet.pubkey];
            const keys: Record<string, string> = {
                Title: snippet.title,
                Language: snippet.language,
                Tags: snippet.tags.join(", "),
                Code: snippet.code,
            };
            if (author?.profile?.name) keys.Author = author.profile.name;
            return Object.entries(keys)
                .map(([key, value]) => `${key}: ${value}`)
                .join("\n");
        })
        .join("\n\n---\n\n");
}

/**
 * Format partial match snippets for display
 * @param snippets Array of code snippets
 * @returns Formatted string representation
 */
export function formatPartialMatches(snippets: CodeSnippet[]): string {
    if (snippets.length === 0) return "";

    let text =
        "\n\nSome other events not included in this result since they had less in common with your search, here is a list of the events that had partial matches:\n\n";
    text += snippets
        .map((snippet) => {
            return ` * ${snippet.title}:\n   Tags: ${snippet.tags.join(", ")}`;
        })
        .join("\n");

    return text;
}
