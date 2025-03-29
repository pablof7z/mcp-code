import type { Database } from "bun:sqlite";

export const up = async (db: Database) => {
    db.run(`
        CREATE TABLE IF NOT EXISTS wot (
            follower TEXT NOT NULL,
            followed TEXT NOT NULL,
            PRIMARY KEY (follower, followed)
        )
    `);

    // Create index for faster lookup by followed pubkey
    db.run(`
        CREATE INDEX IF NOT EXISTS idx_wot_followed
        ON wot (followed)
    `);
};

export const down = async (db: Database) => {
    db.run("DROP TABLE IF EXISTS wot");
};
