# tenex-tools Project Overview

## Purpose

This project acts as a bridge between the Model Context Protocol (MCP) and the Nostr network. Its primary function is to enable AI language models, interacting via MCP, to publish content directly to the Nostr decentralized social network.

## Key Features

- **MCP Server Implementation:** MCP server allow coding agents to find code snippets, agents and instructions
- **CLI Interface:** Provides command-line tools for managing Nostr identities, profiles, content publishing, and other Nostr-related tasks.
- **Code Snippet Sharing:** Allows publishing and finding code snippets on Nostr.

## Technology Stack

- **Runtime:** Bun
- **Language:** TypeScript
- **Core Libraries:**
    - `@modelcontextprotocol/sdk`: For MCP communication.
    - `@nostr-dev-kit/ndk`: For Nostr protocol interactions.
    - `commander`: For building the CLI interface.

## Configuration

Configuration details (like user keys, relays) are typically stored in `~/.tenex-tools.json` (Note: This path might need confirmation or could be configurable).