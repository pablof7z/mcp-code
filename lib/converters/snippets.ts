import type { NDKEvent } from "@nostr-dev-kit/ndk";
import { knownUsers } from "../../users.js";
import type { CodeSnippet } from "../types/index.js";

/**
 * Converts an NDKEvent into a CodeSnippet
 * @param event NDKEvent of kind 1337
 * @returns CodeSnippet object
 */
export function toSnippet(event: NDKEvent): CodeSnippet {
    const title = event.tagValue("title") ?? event.tagValue("name");
    const description = event.tagValue("description") ?? "";
    const language = event.tagValue("l");
    const tags = event.tags
        .filter((tag) => tag[0] === "t" && tag[1] !== undefined)
        .map((tag) => tag[1] as string);

    return {
        id: event.id,
        title: title || "Untitled",
        description,
        code: event.content,
        language: language || "text",
        pubkey: event.pubkey,
        createdAt: event.created_at || 0,
        tags,
    };
}

/**
 * Converts a CodeSnippet to a formatted metadata string (without code)
 * @param snippet CodeSnippet object
 * @returns Formatted metadata string
 */
export function toMetadataString(snippet: CodeSnippet): string {
    const { title, description, language, tags, id, pubkey, createdAt } = snippet;
    const profile = knownUsers[pubkey]?.profile;
    
    const returns = [
        `ID: ${id}`,
        `Title: ${title}`,
        `Description: ${description}`,
        `Language: ${language}`,
        `Tags: ${tags.join(", ")}`,
        `Created: ${new Date(createdAt * 1000).toISOString()}`,
        `Pubkey: ${pubkey}`,
    ];

    if (profile?.name) returns.push(`Author: ${profile.name}`);

    return returns.join("\n");
}

/**
 * Formats a single snippet for display
 * @param snippet The snippet to format
 * @returns Formatted string representation
 */
export function formatSnippet(snippet: CodeSnippet): string {
    return formatSnippets([snippet]);
}

/**
 * Formats snippets for display
 * @param snippets Array of code snippets
 * @returns Formatted string representation
 */
export function formatSnippets(snippets: CodeSnippet[]): string {
    return snippets
        .map((snippet) => {
            const author = knownUsers[snippet.pubkey];
            const keys: Record<string, string> = {
                ID: snippet.id,
                Title: snippet.title,
                Description: snippet.description,
                Language: snippet.language,
                Tags: snippet.tags.join(", "),
                Code: snippet.code,
                Date: new Date(snippet.createdAt * 1000).toISOString(),
            };
            if (author?.profile?.name) keys.Author = author.profile.name;
            return Object.entries(keys)
                .map(([key, value]) => `${key}: ${value}`)
                .join("\n");
        })
        .join("\n\n---\n\n");
}

/**
 * Formats partial match snippets for display
 * @param snippets Array of code snippets
 * @returns Formatted string representation
 */
export function formatPartialMatches(snippets: CodeSnippet[]): string {
    if (snippets.length === 0) return "";

    let text =
        "\n\nSome other events not included in this result since they had less in common with your search, here is a list of the events that had partial matches:\n\n";
    text += snippets
        .map((snippet) => {
            return ` * ${snippet.title}:\n   Tags: ${snippet.tags.join(", ")} (ID: ${snippet.id})`;
        })
        .join("\n");

    return text;
}

/**
 * Parses metadata from a file content string
 * @param fileContent String containing metadata and code sections
 * @returns Object with metadata and code
 */
export function parseMetadataFromString(fileContent: string): {
    metadata: { title: string; description: string; language: string; tags: string[] };
    code: string
} {
    // Match the metadata and code sections
    const metadataRegex = /^---METADATA---([\s\S]*?)(?=^---CODE---$)(^---CODE---$)([\s\S]*)$/m;
    const matches = fileContent.match(metadataRegex);

    if (!matches || matches.length < 4) {
        throw new Error("Invalid file format: metadata section not found");
    }

    const metadataSection = matches[1] || "";
    let codeSection = matches[3] || "";

    // Remove leading newline from code section if present
    if (codeSection.startsWith("\n")) {
        codeSection = codeSection.substring(1);
    }

    // Parse each field with proper multiline flag
    const titleMatch = metadataSection.match(/^Title:\s*(.+)$/m);
    const title = titleMatch?.[1] ? titleMatch[1].trim() : "";

    // Extract description which can be multiline but should stop at Language: or Tags:
    const descriptionLines = [];
    let inDescription = false;

    // Process line by line
    const lines = metadataSection.split('\n');
    for (const line of lines) {
        if (line.trim().startsWith('Description:')) {
            inDescription = true;
            const content = line.replace(/^Description:\s*/, '').trim();
            if (content) {
                descriptionLines.push(content);
            }
        } else if (line.trim().startsWith('Language:') || line.trim().startsWith('Tags:')) {
            inDescription = false;
        } else if (inDescription) {
            descriptionLines.push(line);
        }
    }

    const description = descriptionLines.join('\n').trim();

    const languageMatch = metadataSection.match(/^Language:\s*(.+)$/m);
    const language = languageMatch?.[1] ? languageMatch[1].trim() : "";

    const tagsMatch = metadataSection.match(/^Tags:\s*(.+)$/m);
    const tagsString = tagsMatch?.[1] ? tagsMatch[1].trim() : "";
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(Boolean);

    return {
        metadata: {
            title,
            description,
            language,
            tags
        },
        code: codeSection
    };
}

/**
 * Creates a string with metadata and code sections
 */
export function createMetadataString(
    title: string,
    description: string,
    language: string,
    tags: string[],
    code: string
): string {
    return `---METADATA---
# Edit the metadata below. Keep the format exactly as shown (Title:, Description:, Language:, Tags:)
# Description needs to be at least 140 characters and Tags need at least 5 entries
# Don't remove the ---METADATA--- and ---CODE--- markers!

Title: ${title}
Description: ${description}
Language: ${language}
Tags: ${tags.join(', ')}
---CODE---
${code}`;
} 