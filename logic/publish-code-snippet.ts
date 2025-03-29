import { NDKEvent } from "@nostr-dev-kit/ndk";
import { z } from "zod";
import { SNIPPET_KIND, getSigner } from "../lib/nostr/utils.js";
import { ndk } from "../ndk.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { readConfig, getUser } from "../config.js";
import { existsSync } from "node:fs";
import * as Bun from "bun";

function log(message: string, ...args: any[]) {
    // append to ~/.nmcp-nostr.log
    const logFilePath = join(homedir(), ".nmcp-nostr.log");
    const logMessage = `${new Date().toISOString()} - ${message}\n`;
    writeFileSync(logFilePath, logMessage, { flag: "a" });
}

/**
 * Parse metadata from the beginning of a file
 * Format: 
 * ---METADATA---
 * Title: My Title
 * Description: My description goes here...
 * Language: javascript
 * Tags: tag1, tag2, tag3, tag4, tag5
 * ---CODE---
 */
export function parseMetadata(fileContent: string): {
    metadata: { title: string; description: string; language: string; tags: string[] };
    code: string
} {
    // Match the metadata and code sections - this regex was matching incorrectly
    // Making it non-greedy for the first part and fixing the boundary for CODE marker
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
    const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : "";

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
    const language = languageMatch && languageMatch[1] ? languageMatch[1].trim() : "";

    const tagsMatch = metadataSection.match(/^Tags:\s*(.+)$/m);
    const tagsString = tagsMatch && tagsMatch[1] ? tagsMatch[1].trim() : "";
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
 * Create a file with metadata and code sections
 */
export function createFileWithMetadata(
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

/**
 * Publish a code snippet to Nostr
 * @param title Title of the snippet
 * @param description Description of the snippet
 * @param language Programming language
 * @param code The code snippet content
 * @param tags Tags to categorize the snippet
 * @param username Username to publish as
 * @returns Publication results
 */
export async function publishCodeSnippet(
    title: string,
    description: string,
    language: string,
    code: string,
    tags: string[] = [],
    username?: string
): Promise<{ content: Array<{ type: "text", text: string }> }> {
    try {
        // Validate minimum requirements
        // if (tags.length < 5) {
        //     throw new Error(
        //         "Insufficient tags. At least 5 tags are required. Please add more relevant and accurate information."
        //     );
        // }

        // if (description.length < 140) {
        //     throw new Error(
        //         "Description is too short. At least 140 characters are required. Please add more relevant and accurate information."
        //     );
        // }

        // put the code snippet in a temp file and run the command in config.editor or `code` and wait until it's closed -- then read the file and publish it
        const config = readConfig();
        const tempFilePath = join(tmpdir(), `snippet-${Date.now()}.${language}`);

        // Create file content with metadata section for editing
        const fileContent = createFileWithMetadata(title, description, language, tags, code);

        // Write the content to the temp file
        writeFileSync(tempFilePath, fileContent);

        // Use the editor specified in config, or default to 'code' (VS Code)
        const editorCommand = (config.editor || 'code --wait').split(' ');

        // Spawn the editor process - first arg is the command array including both the command and its arguments
        const process = Bun.spawn([...editorCommand, tempFilePath]);

        log("spawned editor process to edit " + tempFilePath);

        // Wait for the editor to close
        await process.exited;

        // Read the potentially modified content from the temp file
        let updatedTitle = title;
        let updatedDescription = description;
        let updatedLanguage = language;
        let updatedTags = tags;
        let updatedCode = code;

        if (existsSync(tempFilePath)) {
            const updatedContent = readFileSync(tempFilePath, "utf-8");
            try {
                log("updatedContent: " + updatedContent);
                const parsed = parseMetadata(updatedContent);
                updatedTitle = parsed.metadata.title || title;
                updatedDescription = parsed.metadata.description || description;
                updatedLanguage = parsed.metadata.language || language;
                updatedTags = parsed.metadata.tags.length >= 5 ? parsed.metadata.tags : tags;
                updatedCode = parsed.code;
            } catch (error) {
                log("error " + error);
                console.error("Error parsing metadata:", error);
                // Fallback to using the file content as just code if metadata parsing fails
                updatedCode = updatedContent;
            }
        } else {
            log("tempFilePath does not exist", tempFilePath);
        }

        const eventTags = [
            ["name", updatedTitle],
            ["description", updatedDescription],
            ["l", updatedLanguage],
            ...updatedTags.map((tag) => ["t", tag]),
        ];

        const event = new NDKEvent(ndk, {
            kind: SNIPPET_KIND,
            content: updatedCode,
            tags: eventTags,
        });

        // Get the appropriate signer based on username
        const signer = await getSigner(username);

        // Sign the event with the selected signer
        await event.sign(signer);

        // Publish the already signed event
        await event.publish();

        return {
            content: [
                {
                    type: "text",
                    text: `Published code snippet "${updatedTitle}" to Nostr: The snippet can be seeen in https://snipsnip.dev/snippet/${event.id} or https://njump.me/${event.encode()}`,
                },
            ],
        };
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to publish code snippet: ${errorMessage}`);
    }
}

export function addPublishCodeSnippetCommand(server: McpServer) {
    server.tool(
        "publish-new-code-snippet",
        "Publish a new code snippet to Nostr",
        {
            title: z.string(),
            description: z.string(),
            language: z.string(),
            code: z.string(),
            tags: z.array(z.string()),
            username: z.string().optional().describe(
                "Username to publish as (you can see list_usernames to see available usernames)"
            ),
        },
        async ({ title, description, language, code, tags = [], username }, _extra) => {
            return publishCodeSnippet(title, description, language, code, tags, username);
        }
    );
}
