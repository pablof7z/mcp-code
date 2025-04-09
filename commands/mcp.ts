import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Command } from "commander";
import { readConfig } from "../config.js";
import { addCreatePubkeyCommand } from "../logic/create-pubkey.js";
import { addDepositCommand } from "../logic/deposit.js";
import { addFetchSnippetByIdCommand } from "../logic/fetch_snippet_by_id.js";
import { addFindSnippetsCommand } from "../logic/find_snippets.js";
import { addFindUserCommand } from "../logic/find_user.js";
import { addListSnippetsCommand } from "../logic/list_snippets.js";
import { addListUsernamesCommand } from "../logic/list_usernames.js";
import { addPublishCodeSnippetCommand } from "../logic/publish-code-snippet.js";
import { addPublishCommand } from "../logic/publish.js";
import { addWalletBalanceCommand } from "../logic/wallet-balance.js";
import { addZapCommand } from "../logic/zap.js";
import { log } from "../utils/log.js";

// Define type for command functions
type CommandFunction = (server: McpServer) => void;

// Map of command names to their registration functions
const commandMap: Record<string, CommandFunction> = {
    publish: addPublishCommand,
    "publish-snippet": addPublishCodeSnippetCommand,
    "create-pubkey": addCreatePubkeyCommand,
    "find-user": addFindUserCommand,
    "find-snippets": addFindSnippetsCommand,
    "list-usernames": addListUsernamesCommand,
    "list-snippets": addListSnippetsCommand,
    "fetch-snippet-by-id": addFetchSnippetByIdCommand,
    zap: addZapCommand,
    "wallet-balance": addWalletBalanceCommand,
    deposit: addDepositCommand,
};

// Global server instance
const mcpServer = new McpServer({
    name: "Nostr Publisher",
    version: "1.0.0",
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

    // If mcpCommands is specified in config, only register those commands
    if (enabledCommands && enabledCommands.length > 0) {
        for (const cmd of enabledCommands) {
            if (commandMap[cmd]) {
                commandMap[cmd](server);
            }
        }
    } else {
        // Otherwise register all commands
        addPublishCommand(server);
        addPublishCodeSnippetCommand(server);
        addCreatePubkeyCommand(server);
        addFindUserCommand(server);
        addFindSnippetsCommand(server);
        addListUsernamesCommand(server);
        addListSnippetsCommand(server);
        addFetchSnippetByIdCommand(server);
        addZapCommand(server);
        addWalletBalanceCommand(server);
    }
    addDepositCommand(server);
}
