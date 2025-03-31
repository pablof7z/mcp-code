import { Command } from 'commander';
import { registerFindSnippetsCommand } from './find-snippets.js';
import { registerWotCommand } from './wot.js';
import { registerListUsernamesCommand } from './list-usernames.js';
import { registerMcpCommand } from './mcp.js';
import { registerSetupCommand } from './setup.js';

// Create a new Commander program
const program = new Command();

// Setup program metadata
program
    .name('mcp-nostr')
    .description('Model Context Protocol for Nostr')
    .version('1.0.0');

// Register all commands
registerMcpCommand(program);
registerFindSnippetsCommand(program);
registerWotCommand(program);
registerListUsernamesCommand(program);
registerSetupCommand(program);

// Function to run the CLI
export async function runCli(args: string[]) {
    program.parse(args);

    // If no command was specified, show help by default
    if (args.length <= 2) {
        program.help();
    }
} 