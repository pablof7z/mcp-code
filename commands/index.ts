#!/usr/bin/env node
import { Command } from 'commander';
const VERSION = "__VERSION__";
import { registerFindSnippetsCommand } from './find-snippets.js';
import { registerWotCommand } from './wot.js';
import { registerMcpCommand } from './mcp.js';
import { registerSetupCommand } from './setup.js';
import { registerAgentCommand } from './agent.js';
import { registerInstructionCommand } from './instruction.js';

// Create a new Commander program
const program = new Command();

// Setup program metadata
program
    .name('tenex-tools')
    .description('Model Context Protocol for Nostr')
    .version(VERSION);

// Register all commands
registerMcpCommand(program);
registerFindSnippetsCommand(program);
registerWotCommand(program);
registerSetupCommand(program);
registerAgentCommand(program);
registerInstructionCommand(program);

// Function to run the CLI
export async function runCli(args: string[]) {
    program.parse(args);

    // If no command was specified, show help by default
    if (args.length <= 2) {
        program.help();
    }
} 