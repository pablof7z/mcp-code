import { NDKEvent, type NDKFilter, type NDKKind } from "@nostr-dev-kit/ndk";
import { ndk } from "../../ndk.js";
export { NDKEvent, ndk };
import { log } from "../utils/log.js";

// Define the agent kind
export const AGENT_KIND = 1338 as NDKKind;

/**
 * Fetch an agent by its event ID
 * @param eventId The Nostr event ID
 * @returns The agent event or null if not found
 */
export async function fetchAgentById(eventId: string): Promise<NDKEvent | null> {
  const filter: NDKFilter = {
    kinds: [AGENT_KIND],
    ids: [eventId],
  };

  log(`Fetching agent with ID: ${eventId}`);
  const events = await ndk.fetchEvents(filter);
  
  if (events.size === 0) {
    return null;
  }
  
  const eventArray = Array.from(events);
  return eventArray[0] as NDKEvent;
}

/**
 * Find agents matching a query
 * @param query The search query
 * @param limit Maximum number of results to return
 * @returns Array of matching agent events
 */
export async function findAgents(query: string, limit: number = 50): Promise<NDKEvent[]> {
  const filter: NDKFilter = {
    kinds: [AGENT_KIND],
    limit,
  };

  log(`Searching for agents matching: ${query}`);
  const events = await ndk.fetchEvents(filter);
  
  // Filter events based on the query
  return Array.from(events).filter(event => {
    // Search in title, description, and tags
    const title = event.tags.find(tag => tag[0] === 'title')?.[1] || '';
    const description = event.tags.find(tag => tag[0] === 'description')?.[1] || '';
    const tags = event.tags.filter(tag => tag[0] === 't').map(tag => tag[1]);
    
    // Case-insensitive search
    const lowerQuery = query.toLowerCase();
    return (
      title.toLowerCase().includes(lowerQuery) ||
      description.toLowerCase().includes(lowerQuery) ||
      tags.some(tag => tag?.toLowerCase().includes(lowerQuery))
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
 * Format agent events for display
 * @param agents Array of agent events
 * @returns Formatted string representation of agents
 */
export function formatAgents(agents: NDKEvent[]): string {
  if (agents.length === 0) {
    return "No agents found.";
  }

  return agents.map((agent, index) => {
    const title = getTagValue(agent, 'title');
    const description = getTagValue(agent, 'description');
    const model = getTagValue(agent, 'model');
    
    return `${index + 1}. ${title}: ${description}${model ? ` (${model})` : ''}`;
  }).join('\n');
}