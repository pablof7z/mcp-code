/**
 * Type definitions for instruction-related functionality
 */

/**
 * Parameters for finding instructions
 */
export interface FindInstructionsParams {
  query: string;
  limit?: number;
}

/**
 * Parameters for getting an instruction by ID
 */
export interface GetInstructionParams {
  eventId: string;
}

/**
 * Parameters for publishing an instruction
 */
export interface PublishInstructionParams {
  filePath: string;
  title: string;
  description: string;
  tags: string[];
}