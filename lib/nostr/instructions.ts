import { NDKEvent, type NDKFilter, type NDKKind } from "@nostr-dev-kit/ndk";
import { ndk } from "../../ndk.js";
export { NDKEvent, ndk };
import { log } from "../utils/log.js";
import fs from 'fs';

// Define the instruction kind
export const INSTRUCTION_KIND = 1339 as NDKKind;

/**
 * Fetch an instruction by its event ID
 * @param eventId The Nostr event ID
 * @returns The instruction event or null if not found
 */
export async function fetchInstructionById(eventId: string): Promise<NDKEvent | null> {
  const filter: NDKFilter = {
    kinds: [INSTRUCTION_KIND],
    ids: [eventId],
  };

  log(`Fetching instruction with ID: ${eventId}`);
  const events = await ndk.fetchEvents(filter);
  
  if (events.size === 0) {
    return null;
  }
  
  const eventArray = Array.from(events);
  return eventArray[0] as NDKEvent;
}

/**
 * Find existing instructions by title and pubkey
 * @param title Instruction title to search for
 * @param pubkey Pubkey of the author
 * @returns Array of matching instruction events
 */
export async function findExistingInstructions(title: string, pubkey: string): Promise<NDKEvent[]> {
  const filter: NDKFilter = {
    kinds: [INSTRUCTION_KIND],
    authors: [pubkey],
  };

  log(`Looking for existing instructions with title "${title}" from pubkey ${pubkey}`);
  const events = await ndk.fetchEvents(filter);
  log(`Found ${events.size} existing instructions`);
  
  return Array.from(events);
}

/**
 * Get version number from instruction event
 * @param event The instruction event
 * @returns Version number as string, or "1" if not found
 */
export function getVersion(event: NDKEvent): string {
  return event.tags.find(tag => tag[0] === "ver")?.[1] || "1";
}

/**
 * Find instructions matching a query
 * @param query The search query
 * @param limit Maximum number of results to return
 * @returns Array of matching instruction events
 */
export async function findInstructions(query: string, limit: number = 50): Promise<NDKEvent[]> {
  const filter: NDKFilter = {
    kinds: [INSTRUCTION_KIND],
    limit,
  };
  const regexp = new RegExp(query, 'i');

  log(`Searching for instructions matching: ${query}`);
  const events = await ndk.fetchEvents(filter);
  
  // Filter events based on the query
  return Array.from(events).filter(event => {
    // Search in title, description, and tags
    const title = getTagValue(event, 'title') || '';
    const description = getTagValue(event, 'description') || '';
    const tags = event.tags.filter(tag => tag[0] === 't').map(tag => tag[1]);
    
    // Case-insensitive search
    const lowerQuery = query.toLowerCase();
    return (
      title.toLowerCase().includes(lowerQuery) ||
      description.toLowerCase().includes(lowerQuery) ||
      tags.some(tag => tag?.toLowerCase().includes(lowerQuery)) ||
      event.content.match(regexp)
    );
  });
}

/**
 * Get the tag value from an event
 * @param event The Nostr event
 * @param tagName The tag name to find
 * @param defaultValue Optional default value if tag not found
 * @returns The tag value or default value
 */
export function getTagValue(event: NDKEvent, tagName: string, defaultValue: string = ''): string {
  return event.tags.find((tag: string[]) => tag[0] === tagName)?.[1] || defaultValue;
}

/**
 * Format instruction events for display
 * @param instructions Array of instruction events
 * @returns Formatted string representation of instructions
 */
export function formatInstructions(instructions: NDKEvent[]): string {
  if (instructions.length === 0) {
    return "No instructions found.";
  }

  return instructions.map((instruction, index) => {
    const title = getTagValue(instruction, 'title');
    const description = getTagValue(instruction, 'description');
    const version = getVersion(instruction);
    
    return `${index + 1}. ${title} (v${version}): ${description}`;
  }).join('\n');
}

/**
 * Publish an instruction to Nostr
 * @param content The instruction content
 * @param title The instruction title
 * @param description The instruction description
 * @param tags The instruction tags
 * @returns The published event
 */
export async function publishInstruction(
  content: string,
  title: string,
  description: string,
  tags: string[]
): Promise<NDKEvent> {
  const event = new NDKEvent(ndk);
  event.kind = INSTRUCTION_KIND;
  
  // Determine version number
  let version = "1";
  try {
    const existingEvents = await findExistingInstructions(title, ndk.signer?.pubkey || "");
    if (existingEvents.length > 0) {
      const versions = existingEvents.map(getVersion).map(v => parseInt(v, 10));
      version = (Math.max(...versions) + 1).toString();
    }
  } catch (error) {
    log(`Error checking for existing versions: ${error}`);
  }
  
  // Add standard tags
  event.tags = [
    ['title', title],
    ['description', description],
    ['ver', version],
    ...tags.map(tag => ['t', tag])
  ];
  
  event.content = content;
  
  await event.publish();
  
  return event;
}