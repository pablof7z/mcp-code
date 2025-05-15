import type { Database } from "better-sqlite3";

export async function up(db: Database): Promise<void> {
    db.exec(`
        CREATE TABLE IF NOT EXISTS snippets (
            id TEXT PRIMARY KEY NOT NULL,      -- Nostr event ID
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            code TEXT NOT NULL,
            language TEXT NOT NULL,
            pubkey TEXT NOT NULL,              -- Author's pubkey
            createdAt INTEGER NOT NULL,        -- Unix timestamp
            tags TEXT NOT NULL                 -- JSON string array of tags
        );
        CREATE INDEX IF NOT EXISTS idx_snippets_pubkey ON snippets (pubkey);
        CREATE INDEX IF NOT EXISTS idx_snippets_language ON snippets (language);
        CREATE INDEX IF NOT EXISTS idx_snippets_createdAt ON snippets (createdAt);
    `);
}

export async function down(db: Database): Promise<void> {
    db.exec("DROP TABLE IF EXISTS snippets");
}