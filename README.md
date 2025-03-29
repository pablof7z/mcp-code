# MCP-NOSTR: Nostr Publisher for Model Context Protocol

A bridge between the Model Context Protocol (MCP) and the Nostr network, enabling AI language models to publish content to Nostr.

## Features

- Implements the Model Context Protocol for interacting with AI language models
- Provides CLI commands for managing Nostr identities, profiles, and content
- Publishes AI-generated content to the Nostr network
- Supports Web of Trust (WoT) for verified connections
- Manages user profiles and follows

## Installation

```bash
bunx mcp-code mcp
```

### From source

```bash
# Clone the repository
git clone https://github.com/pablof7z/mcp-nostr.git
cd mcp-nostr

# Install dependencies
bun install

# Build the executable
bun run build
```

## Usage

### As an MCP Server

Run without arguments to start the MCP server mode, which listens for MCP protocol messages on stdin and responds on stdout:

```bash
./mcp-code
```

### CLI Commands

The tool also provides various command-line utilities for managing Nostr profiles and content:

```bash
# See available commands
./mcp-code --help
```

## Configuration

Configuration is stored in `~/.mcp-nostr.json`:



## Development

```bash
# Run linting
bun run lint

# Format code
bun run format

# Check and fix issues
bun run check
```

## Dependencies

- [@modelcontextprotocol/sdk](https://github.com/model-context-protocol/sdk) - SDK for the Model Context Protocol
- [@nostr-dev-kit/ndk](https://github.com/nostr-dev-kit/ndk) - Nostr Development Kit
- [@nostr-dev-kit/ndk-wallet](https://github.com/nostr-dev-kit/ndk-wallet) - Wallet integration for NOSTR
- [commander](https://github.com/tj/commander.js) - Command-line interface framework
- [yaml](https://github.com/eemeli/yaml) - YAML parsing and serialization

## License

MIT
