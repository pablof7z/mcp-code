const VERSION = "__VERSION__";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Command } from "commander";
import { readConfig } from "../config.js";
import { addFetchSnippetByIdCommand } from "../logic/fetch_snippet_by_id.js";
import { addFindAgentsCommand, addGetAgentCommand } from "../logic/agent.js";
import { addFindSnippetsCommand } from "../logic/find_snippets.js";
import { addFindInstructionsCommand, addGetInstructionCommand } from "../logic/instruction.js";
import { addListSnippetsCommand } from "../logic/list_snippets.js";
import { addPublishCodeSnippetCommand } from "../logic/publish-code-snippet.js";
import { log } from "../lib/utils/log.js";

// Define type for command functions
type CommandFunction = (server: McpServer) => void;

// Map of command names to their registration functions
export const commandMap: Record<string, CommandFunction> = {
    "snippets.find": addFindSnippetsCommand,
    "snippets.list": addListSnippetsCommand,
    "snippet.publish": addPublishCodeSnippetCommand,
    "snippet.fetch": addFetchSnippetByIdCommand,

    "agents.find": addFindAgentsCommand,
    "agent.get": addGetAgentCommand,

    "instructions.find": addFindInstructionsCommand,
    "instructions.get": addGetInstructionCommand,
};

// Global server instance
const mcpServer = new McpServer({
    name: "Nostr Publisher",
    version: VERSION,
    capabilities: {
        resources: {},
    },
});

export function registerMcpCommand(program: Command): void {
    program
        .command("mcp")
        .description("Start the MCP server")
        .action(async () => {
            try {
                // Create the MCP server

                // Register all MCP commands
                registerMcpCommands(mcpServer);

                // Connect the server to the transport
                log("Starting MCP server...");
                const transport = new StdioServerTransport();
                await mcpServer.connect(transport);
            } catch (error) {
                console.error("Error starting MCP server:", error);
                process.exit(1);
            }
        });
}

// Register all MCP commands, filtered by config if specified
export function registerMcpCommands(server: McpServer) {
    const config = readConfig();
    const enabledCommands = config.mcpCommands;

    for (const [cmd, fn] of Object.entries(commandMap)) {
        if (!enabledCommands || enabledCommands.includes(cmd))
            fn(server);
    }
}
