import type { CodeSnippet } from "../types/index.js";

/**
 * In-memory cache to store snippets by ID for efficient retrieval
 * Used by list_snippets and fetch_snippet_by_id commands
 */
export const snippetsCache: Record<string, CodeSnippet> = {}; 