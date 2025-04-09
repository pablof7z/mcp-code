import { Command } from "commander";
import {
    formatPartialMatches,
    formatSnippets,
    getSnippets,
} from "../lib/nostr/snippets.js";

export function registerFindSnippetsCommand(program: Command): void {
    program
        .command("find-snippets")
        .description("Find code snippets with optional filters")
        .option("--limit <number>", "Maximum number of snippets to return")
        .option(
            "--languages <list>",
            "Comma-separated list of languages to filter by"
        )
        .option("--tags <list>", "Comma-separated list of tags to filter by")
        .option(
            "--authors <list>",
            "Comma-separated list of authors to filter by"
        )
        .action(async (options) => {
            try {
                // Parse options
                const limit = options.limit
                    ? parseInt(options.limit, 10)
                    : undefined;
                const languages = options.languages
                    ? options.languages.split(",")
                    : undefined;
                const tags = options.tags ? options.tags.split(",") : undefined;
                const authors = options.authors
                    ? options.authors.split(",")
                    : undefined;

                const { snippets, otherSnippets } = await getSnippets({
                    limit,
                    languages,
                    tags,
                    authors,
                });

                if (snippets.length === 0) {
                    console.log(
                        "No code snippets found matching the criteria."
                    );
                } else {
                    const formattedSnippets = formatSnippets(snippets);
                    const partialMatchesText =
                        formatPartialMatches(otherSnippets);
                    console.log(
                        `Found ${snippets.length} code snippets:\n\n${formattedSnippets}${partialMatchesText}`
                    );
                }
            } catch (error) {
                console.error("Error executing find-snippets command:", error);
                process.exit(1);
            }
        });
}
