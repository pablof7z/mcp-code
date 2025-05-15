import type { Database } from "better-sqlite3";

export const up = async (db: Database) => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS profiles (
            pubkey TEXT PRIMARY KEY,
            profile TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
};

export const down = async (db: Database) => {
    db.exec("DROP TABLE IF EXISTS profiles");
};
