import { initConfig, readConfig, writeConfig } from "./config.js";
import { initNDK, ndk } from "./ndk.js";
import "./db.js";
import { runCli } from "./commands/index.js";
import { applyMigrations } from "./db.js";
import { log } from "./lib/utils/log.js";
import { runConfigWizard } from "./wizard";

await applyMigrations();

log("starting up...: args: " + process.argv.join(" "));

// Load config and ensure defaults
const config = initConfig();
``;

// If there's no privateKey or bunker configured, run the setup wizard
if (!config.privateKey && !config.bunker) {
    const updatedConfig = await runConfigWizard(config);
    initNDK(updatedConfig);
} else {
    initNDK(config);
}

// Process command-line arguments
const args = process.argv;

// Check if running with "mcp" command
await runCli(args);
