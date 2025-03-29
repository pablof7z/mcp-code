import { Command } from "commander";
import { runConfigWizard } from "../wizard";
import { readConfig } from "../config.js";

/**
 * Register the setup command with the Commander program
 * @param program The Commander program instance
 */
export function registerSetupCommand(program: Command) {
    program
        .command("setup")
        .description("Run the configuration wizard to set up MCP-Nostr")
        .action(async () => {
            const config = readConfig();
            await runConfigWizard(config);
            console.log("Setup complete! You can now use MCP-Nostr.");
        });
} 