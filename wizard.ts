import inquirer from "inquirer";
import NDK from "@nostr-dev-kit/ndk";
import { type ConfigData, writeConfig } from "./config.js";

// Available MCP commands
const MCP_COMMANDS = [
    { name: "Publish Notes", value: "publish" },
    { name: "Publish Code Snippets", value: "publish-snippet" },
    { name: "Create Public Key", value: "create-pubkey" },
    { name: "Find User", value: "find-user" },
    { name: "Find Code Snippets", value: "find-snippets" },
    { name: "List Usernames", value: "list-usernames" },
];

/**
 * Run the configuration wizard to guide the user through first-time setup
 * @param config Current configuration object
 * @returns Updated configuration object
 */
export async function runConfigWizard(config: ConfigData): Promise<ConfigData> {
    console.log("\n🔧 Welcome to MCP-Nostr Configuration Wizard 🔧\n");
    console.log("Let's set up your configuration for first use.\n");

    // Create a temporary NDK instance to validate NIP-05
    const tempNdk = new NDK({ explicitRelayUrls: ["wss://relay.damus.io"] });
    await tempNdk.connect();

    // Step 1: Ask for Web-of-trust entry point
    const { wotFrom } = await inquirer.prompt([
        {
            type: "input",
            name: "wotFrom",
            message: "Enter Web-of-trust entry point (NIP-05):",
            default: "pablo@f7z.io",
        },
    ]);

    config.wotFrom = wotFrom;

    // Validate NIP-05 and show npub
    console.log(`\nValidating NIP-05: ${wotFrom}...`);
    try {
        const user = await tempNdk.getUserFromNip05(wotFrom);
        if (user) {
            console.log(`✅ Valid NIP-05! Found npub: ${user.npub}`);
        } else {
            console.log(`⚠️ Could not verify NIP-05: ${wotFrom}`);
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error validating NIP-05: ${errorMessage}`);
    }

    console.log("🔑 Authentication Methods");
    console.log("This is what will be used to publish code snippets and notes when you choose to publish without a dedicated profile.");

    // Step 2: Ask for authentication method
    const { authMethod } = await inquirer.prompt([
        {
            type: "list",
            name: "authMethod",
            message: "Choose authentication method:",
            choices: [
                { name: "Private Key (nsec)", value: "nsec" },
                { name: "Bunker Connection (bunker://)", value: "bunker" },
            ],
        },
    ]);

    // Step 3: Ask for authentication value based on chosen method
    if (authMethod === "nsec") {
        const { privateKey } = await inquirer.prompt([
            {
                type: "password",
                name: "privateKey",
                message: "Enter your private key (nsec):",
                mask: "*",
            },
        ]);
        config.privateKey = privateKey;
    } else {
        const { bunker } = await inquirer.prompt([
            {
                type: "input",
                name: "bunker",
                message: "Enter bunker connection string (bunker://):",
                validate: (input) => {
                    return input.startsWith("bunker://")
                        ? true
                        : "Bunker connection string must start with 'bunker://'";
                },
            },
        ]);
        config.bunker = bunker;
    }

    // Step 4: Ask for relays
    const { useDefaultRelays } = await inquirer.prompt([
        {
            type: "confirm",
            name: "useDefaultRelays",
            message: "Use default relays?",
            default: true,
        },
    ]);

    if (useDefaultRelays) {
        // Default relays are already set in ndk.ts, no need to set here
    } else {
        const { relays } = await inquirer.prompt([
            {
                type: "input",
                name: "relays",
                message: "Enter comma-separated relay URLs (wss://...):",
                default: "wss://relay.damus.io,wss://relay.primal.net,wss://nos.lol",
                validate: (input) => {
                    const relayList = input.split(",").map((r: string) => r.trim());
                    const allValid = relayList.every((r: string) => r.startsWith("wss://"));
                    return allValid ? true : "All relay URLs should start with 'wss://'";
                },
                filter: (input) => {
                    return input.split(",").map((r: string) => r.trim());
                }
            },
        ]);
        config.relays = relays;
    }

    // Step 5: Ask for MCP commands to enable
    const { enableAllCommands } = await inquirer.prompt([
        {
            type: "confirm",
            name: "enableAllCommands",
            message: "Enable all MCP commands?",
            default: true,
        },
    ]);

    if (enableAllCommands) {
        // All commands are enabled by default by setting an empty array or undefined
        config.mcpCommands = undefined;
    } else {
        const { selectedCommands } = await inquirer.prompt([
            {
                type: "checkbox",
                name: "selectedCommands",
                message: "Select which MCP commands to enable:",
                choices: MCP_COMMANDS,
                default: MCP_COMMANDS.map(cmd => cmd.value),
                validate: (input) => {
                    return input.length > 0
                        ? true
                        : "You must select at least one command";
                },
            },
        ]);
        config.mcpCommands = selectedCommands;
    }

    // Save configuration
    writeConfig(config);

    console.log("\n✅ Configuration saved successfully!\n");

    return config;
} 