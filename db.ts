import { Database } from "bun:sqlite";
import { homedir } from "node:os";
import { join } from "node:path";
import { readConfig } from "./config.js";

// Load config
const config = readConfig();

// Set database path from config or use default
const dbPath = config.dbPath || join(homedir(), ".mcp-nostr.db");
export const db = new Database(dbPath);

// Create migration table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

// Define migration interface
interface Migration {
    name: string;
    module: () => Promise<{ up: (db: Database) => Promise<void> }>;
}

// Import all migrations
// Add new migrations to this array when created
export const migrations: Migration[] = [
    // Example:
    // { name: '001_initial_schema', module: () => import('./migrations/001_initial_schema.js') },
    // Add all migrations here
];

/**
 * Apply any pending migrations
 */
export async function applyMigrations() {
    // Get already applied migrations
    const appliedMigrations = db.query("SELECT name FROM migrations").all() as {
        name: string;
    }[];
    const appliedSet = new Set(appliedMigrations.map((m) => m.name));

    for (const migration of migrations) {
        // Skip if already applied
        if (appliedSet.has(migration.name)) {
            continue;
        }

        console.log(`Applying migration: ${migration.name}`);

        try {
            // Import and run the migration
            const module = await migration.module();
            await module.up(db);

            // Record that the migration was applied
            db.run("INSERT INTO migrations (name) VALUES (?)", [
                migration.name,
            ]);

            console.log(`Successfully applied migration: ${migration.name}`);
        } catch (error) {
            console.error(
                `Failed to apply migration ${migration.name}:`,
                error
            );
            throw error;
        }
    }
}

// Call this during app initialization
await applyMigrations();
