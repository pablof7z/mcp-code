import type { Database } from "bun:sqlite";

export async function up(db: Database): Promise<void> {
    db.run(`
        CREATE TABLE IF NOT EXISTS snippets (
            id TEXT PRIMARY KEY NOT NULL,      -- Nostr event ID
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            code TEXT NOT NULL,
            language TEXT NOT NULL,
            pubkey TEXT NOT NULL,              -- Author's pubkey
            createdAt INTEGER NOT NULL,        -- Unix timestamp
            tags TEXT NOT NULL                 -- JSON string array of tags
        )
    `);

    // Optional: Add indexes for frequently queried columns
    db.run('CREATE INDEX IF NOT EXISTS idx_snippets_pubkey ON snippets (pubkey)');
    db.run('CREATE INDEX IF NOT EXISTS idx_snippets_language ON snippets (language)');
    db.run('CREATE INDEX IF NOT EXISTS idx_snippets_createdAt ON snippets (createdAt)');
}


export async function down(db: Database): Promise<void> {
    db.run("DROP TABLE IF EXISTS snippets");
}