import type { Database } from "bun:sqlite";

export const up = async (db: Database) => {
    db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
            pubkey TEXT PRIMARY KEY,
            profile TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

export const down = async (db: Database) => {
    db.run("DROP TABLE IF EXISTS profiles");
};
