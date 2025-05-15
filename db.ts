import Database from "better-sqlite3";
import { homedir } from "node:os";
import { join } from "node:path";
import { readConfig } from "./config.js";

// Load config
const config = readConfig();

// Set database path from config or use default
const dbPath = config.dbPath || join(homedir(), ".tenex-tools.db");

// Create database instance
export const db = new Database(dbPath);

// Create migration table if it doesn't exist
db.prepare(`
    CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// Define migration interface
interface Migration {
    name: string;
    module: () => Promise<{ up: (db: import("better-sqlite3").Database) => Promise<void> }>;
}

// Import all migrations
export const migrations: Migration[] = [
    { name: '003-create-snippets-table', module: () => import('./migrations/003-create-snippets-table.js') },
];

// Apply any pending migrations
export async function applyMigrations() {
    // Get already applied migrations
    const appliedMigrations = db.prepare("SELECT name FROM migrations").all() as { name: string }[];
    const appliedSet = new Set(appliedMigrations.map((m) => m.name));

    for (const migration of migrations) {
        if (appliedSet.has(migration.name)) continue;

        console.log(`Applying migration: ${migration.name}`);

        try {
            const module = await migration.module();
            await module.up(db);

            db.prepare("INSERT INTO migrations (name) VALUES (?)").run(migration.name);
            console.log(`Successfully applied migration: ${migration.name}`);
        } catch (error) {
            console.error(`Failed to apply migration ${migration.name}:`, error);
            throw error;
        }
    }
}

// Call this during app initialization
await applyMigrations();
