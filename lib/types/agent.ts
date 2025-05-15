/**
 * Type definitions for agent-related functionality
 */

/**
 * Interface for a Roo mode definition
 */
export interface RooMode {
  slug: string;
  name: string;
  roleDefinition: string;
  groups: string[];
  source: string;
  customInstructions: string;
  whenToUse: string;
}

/**
 * Interface for the .roomodes file structure
 */
export interface RooModesFile {
  customModes: RooMode[];
}

/**
 * Parameters for finding agents
 */
export interface FindAgentsParams {
  query: string;
  limit?: number;
}

/**
 * Parameters for getting an agent by ID
 */
export interface GetAgentParams {
  eventId: string;
  roomodesPath: string;
}