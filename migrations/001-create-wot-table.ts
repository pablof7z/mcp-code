import type { Database } from "better-sqlite3";

export const up = async (db: Database) => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS wot (
            follower TEXT NOT NULL,
            followed TEXT NOT NULL,
            PRIMARY KEY (follower, followed)
        );
        CREATE INDEX IF NOT EXISTS idx_wot_followed
        ON wot (followed);
    `);
};

export const down = async (db: Database) => {
    db.exec("DROP TABLE IF EXISTS wot");
};
