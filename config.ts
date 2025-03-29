import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Define interfaces for config structure
export interface UserData {
    nsec?: string;
    npub?: string;
    display_name?: string;
    about?: string;
    profile?: {
        name?: string;
        about?: string;
        picture?: string;
    };
}

export interface ConfigData {
    privateKey?: string;
    bunker?: string;
    bunkerLocalKey?: string;
    dbPath?: string;
    relays?: string[];
    wotFrom?: string;
    mcpCommands?: string[];
    users?: Record<string, UserData>;
    editor?: string;
}

// Path to the config file
const CONFIG_PATH = join(homedir(), ".mcp-nostr.json");

/**
 * Read the config file and parse its contents
 * @returns The parsed config data
 */
export function readConfig(): ConfigData {
    let config: ConfigData = {};

    if (existsSync(CONFIG_PATH)) {
        try {
            config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
        } catch (err) {
            console.error("Error reading config file:", err);
        }
    }

    // Ensure config is an object
    return config ?? {};
}

/**
 * Write config data to the config file
 * @param config The config data to write
 */
export function writeConfig(config: ConfigData): void {
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Get a user from the config by username
 * @param username The username to look up
 * @returns The user data if found, undefined otherwise
 */
export function getUser(username: string): UserData | undefined {
    const config = readConfig();
    return config.users?.[username];
}

/**
 * Save a user to the config
 * @param username The username to save
 * @param userData The user data to save
 */
export function saveUser(username: string, userData: UserData): void {
    const config = readConfig();

    if (!config.users) {
        config.users = {};
    }

    config.users[username] = userData;
    writeConfig(config);
}

/**
 * Get all users from the config
 * @returns A record of all users
 */
export function getAllUsers(): Record<string, UserData> {
    const config = readConfig();
    return config.users || {};
}

/**
 * Get the path to the config file
 * @returns The path to the config file
 */
export function getConfigPath(): string {
    return CONFIG_PATH;
}

/**
 * Ensure the config has a default database path
 * @returns The updated config
 */
export function initConfig(): ConfigData {
    const config = readConfig();

    if (!config.dbPath) {
        config.dbPath = join(homedir(), ".mcp-nostr.db");
        writeConfig(config);
    }

    return config;
}
