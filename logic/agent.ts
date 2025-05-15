import { z } from "zod";
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchAgentById,
  findAgents as findNostrAgents,
  formatAgents,
  getTagValue,
  AGENT_KIND,
  NDKEvent,
  ndk
} from "../lib/nostr/agents.js";
import type { FindAgentsParams, GetAgentParams, RooMode, RooModesFile } from "../lib/types/agent.js";
import { log } from "../lib/utils/log.js";

/**
 * Convert a string to kebab-case
 * @param str The input string
 * @returns The kebab-cased string
 */
function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Convert camelCase to kebab-case
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .toLowerCase(); // Convert to lowercase
}

/**
 * Find agents matching a query
 * @param params Search parameters
 * @returns Formatted response with matching agents
 */
export async function findAgents({ query, limit = 50 }: FindAgentsParams) {
  try {
    const agents = await findNostrAgents(query, limit);
    
    if (agents.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No agents found matching the query.",
          },
        ],
      };
    }
    
    const formattedAgents = formatAgents(agents);
    
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${agents.length} agents:\n\n${formattedAgents}`,
        },
      ],
      metadata: {
        agents: agents.map(agent => ({
          id: agent.id,
          title: getTagValue(agent, 'title'),
          description: getTagValue(agent, 'description'),
        })),
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to find agents: ${errorMessage}`);
  }
}

/**
 * Get an agent by ID and save it to .roomodes file
 * @param params Parameters for getting an agent
 * @returns Response with the result of the operation
 */
export async function getAgent({ eventId, roomodesPath }: GetAgentParams) {
  try {
    const agent = await fetchAgentById(eventId);
    
    if (!agent) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No agent found with ID: ${eventId}`,
          },
        ],
      };
    }
    
    // Get agent details from event tags
    const title = getTagValue(agent, 'title');
    const roleDefinition = getTagValue(agent, 'role');
    const whenToUse = getTagValue(agent, 'situation');
    const customInstructions = getTagValue(agent, 'instructions');
    
    // Create slug from title
    const slug = kebabCase(title);
    
    // Create the agent mode object
    const agentMode: RooMode = {
      slug,
      name: title,
      roleDefinition,
      groups: ['read', 'edit', 'browser', 'command', 'mcp'],
      source: 'project',
      customInstructions,
      whenToUse
    };
    
    // Read existing .roomodes file or create new one
    let roomodes: RooModesFile = { customModes: [] };
    
    if (fs.existsSync(roomodesPath)) {
      try {
        const fileContent = fs.readFileSync(roomodesPath, 'utf-8');
        if (fileContent.trim()) {
          roomodes = JSON.parse(fileContent);
        }
      } catch (error) {
        log(`Error reading .roomodes file: ${error}`);
        // Continue with empty roomodes
      }
    }
    
    // Check if agent already exists
    const existingIndex = roomodes.customModes.findIndex(mode => mode.slug === slug);
    if (existingIndex >= 0) {
      roomodes.customModes[existingIndex] = agentMode;
    } else {
      roomodes.customModes.push(agentMode);
    }
    
    // Create directory if it doesn't exist
    const dir = path.dirname(roomodesPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write updated .roomodes file
    fs.writeFileSync(roomodesPath, JSON.stringify(roomodes, null, 2));
    
    return {
      content: [
        {
          type: "text" as const,
          text: `Agent "${title}" saved to ${roomodesPath}`,
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get agent: ${errorMessage}`);
  }
}

/**
 * Register MCP commands for agent functionality
 * @param server The MCP server instance
 */
export function addFindAgentsCommand(server: McpServer) {
  server.tool(
    "find_agents",
    "Find Roo agents with optional filtering by query",
    {
      query: z
        .string()
        .describe("Search query to find matching agents"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of agents to return"),
    },
    async (args) => findAgents(args)
  );
}

/**
 * Register MCP command for getting an agent by ID
 * @param server The MCP server instance
 */
export function addGetAgentCommand(server: McpServer) {
  server.tool(
    "get_agent",
    "Get a Roo agent by event ID and save it to .roomodes file",
    {
      eventId: z
        .string()
        .describe("Nostr event ID of the agent"),
      roomodesPath: z
        .string()
        .describe("Path to the .roomodes file"),
    },
    async (args) => getAgent(args)
  );
}

/**
 * Parameters for publishing an agent
 */
export interface PublishAgentParams {
  roomodesPath: string;
}

/**
 * Publish an agent from a .roomodes file to Nostr
 * @param params Parameters for publishing an agent
 */
export async function publishAgent({ roomodesPath }: PublishAgentParams) {
  try {
    // Read the .roomodes file
    if (!fs.existsSync(roomodesPath)) {
      throw new Error(`File not found: ${roomodesPath}`);
    }

    const fileContent = fs.readFileSync(roomodesPath, 'utf-8');
    const roomodes: RooModesFile = JSON.parse(fileContent);

    if (!roomodes.customModes || roomodes.customModes.length === 0) {
      throw new Error('No agents found in the .roomodes file');
    }

    // Prompt user to select an agent
    const { selectedAgent } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedAgent',
        message: 'Select an agent to publish:',
        choices: roomodes.customModes.map(mode => ({
          name: `${mode.name} (${mode.slug})`,
          value: mode
        }))
      }
    ]);

    // Create the Nostr event
    const event = new NDKEvent(ndk);
    event.kind = AGENT_KIND;
    event.tags = [
      ['title', selectedAgent.name],
      ['role', selectedAgent.roleDefinition],
      ['instructions', selectedAgent.customInstructions || ''],
      ['t', 'roo-agent'],
      ['t', selectedAgent.slug]
    ];
    event.content = JSON.stringify({
      name: selectedAgent.name,
      roleDefinition: selectedAgent.roleDefinition,
      customInstructions: selectedAgent.customInstructions
    });

    // Sign the event
    await event.sign();

    // Show the signed event
    console.log('Signed event ready to publish:');
    console.log(event.inspect);

    // Ask for confirmation before publishing
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Publish this agent to Nostr?',
        default: false
      }
    ]);

    if (confirm) {
      await event.publish();
      return {
        content: [{
          type: 'text' as const,
          text: `Agent "${selectedAgent.name}" published successfully with ID: ${event.id}`
        }]
      };
    } else {
      return {
        content: [{
          type: 'text' as const,
          text: 'Publishing cancelled'
        }]
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to publish agent: ${errorMessage}`);
  }
}