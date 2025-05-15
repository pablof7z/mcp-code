import { Command } from "commander";
import { runConfigWizard } from "../wizard.js";
import { readConfig } from "../config.js";

/**
 * Register the setup command with the Commander program
 * @param program The Commander program instance
 */
export function registerSetupCommand(program: Command) {
    program
        .command("setup")
        .description("Run the configuration wizard to set up tenex-tools")
        .action(async () => {
            const config = readConfig();
            await runConfigWizard(config);
            process.exit(0);
        });
}