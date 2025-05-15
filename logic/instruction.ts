import { z } from "zod";
import fs from 'fs';
import inquirer from 'inquirer';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchInstructionById,
  findInstructions as findNostrInstructions,
  formatInstructions,
  getTagValue,
  getVersion,
  publishInstruction as publishNostrInstruction
} from "../lib/nostr/instructions.js";
import type { FindInstructionsParams, GetInstructionParams, PublishInstructionParams } from "../lib/types/instruction.js";

/**
 * Find instructions matching a query
 * @param params Search parameters
 * @returns Formatted response with matching instructions
 */
export async function findInstructions({ query, limit = 50 }: FindInstructionsParams) {
  try {
    const instructions = await findNostrInstructions(query, limit);
    
    if (instructions.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No instructions found matching the query.",
          },
        ],
      };
    }
    
    const formattedInstructions = formatInstructions(instructions);
    
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${instructions.length} instructions:\n\n${formattedInstructions}`,
        },
      ],
      metadata: {
        instructions: instructions.map(instruction => ({
          id: instruction.id,
          title: getTagValue(instruction, 'title'),
          description: getTagValue(instruction, 'description'),
          version: getVersion(instruction)
        })),
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to find instructions: ${errorMessage}`);
  }
}

/**
 * Get an instruction by ID
 * @param params Parameters for getting an instruction
 * @returns Response with the instruction content
 */
export async function getInstruction({ eventId }: GetInstructionParams) {
  try {
    const instruction = await fetchInstructionById(eventId);
    
    if (!instruction) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No instruction found with ID: ${eventId}`,
          },
        ],
      };
    }
    
    return {
      content: [
        {
          type: "text" as const,
          text: instruction.content,
        },
      ],
      metadata: {
        version: getVersion(instruction)
      }
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get instruction: ${errorMessage}`);
  }
}

/**
 * Publish an instruction to Nostr
 * @param params Parameters for publishing an instruction
 * @returns Response with the result of the operation
 */
export async function publishInstruction({ filePath, title, description, tags }: PublishInstructionParams) {
  try {
    // Read the instruction file
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Publish to Nostr
    const event = await publishNostrInstruction(
      content,
      title,
      description,
      tags
    );
    
    return {
      content: [{
        type: 'text' as const,
        text: `Instruction "${title}" published successfully with ID: ${event.id}`
      }],
      metadata: {
        version: getVersion(event)
      }
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to publish instruction: ${errorMessage}`);
  }
}

/**
 * Register MCP commands for instruction functionality
 * @param server The MCP server instance
 */
export function addFindInstructionsCommand(server: McpServer) {
  server.tool(
    "find_instructions",
    "Find instructions with optional filtering by query",
    {
      query: z
        .string()
        .describe("Search query to find matching instructions"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of instructions to return"),
    },
    async (args) => findInstructions(args)
  );
}

/**
 * Register MCP command for getting an instruction by ID
 * @param server The MCP server instance
 */
export function addGetInstructionCommand(server: McpServer) {
  server.tool(
    "get_instructions",
    "Get an instruction by event ID",
    {
      eventId: z
        .string()
        .describe("Nostr event ID of the instruction"),
    },
    async (args) => getInstruction(args)
  );
}