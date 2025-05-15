import inquirer from "inquirer";
import { NDKEvent, NDKPrivateKeySigner, serializeProfile, type NDKUserProfile } from "@nostr-dev-kit/ndk";
import { type ConfigData, writeConfig } from "./config.js";
import { ndk } from "./ndk.js";
import { commandMap } from "./commands/mcp.js";

/**
 * Create and publish a kind:0 metadata event
 * @param ndk NDK instance
 * @param signer NDKPrivateKeySigner
 * @param name Display name for the profile
 * @returns Promise that resolves when event is published
 */
async function publishMetadataEvent(signer: NDKPrivateKeySigner, name: string) {
    const event = new NDKEvent(ndk);
    event.kind = 0;
    const profile: NDKUserProfile = {
        name,
        displayName: name,
        about: "Hello, I'm new around here."
    };
    event.content = serializeProfile(profile);
    await event.sign(signer);
    return event.publish();
}

/**
 * Run the configuration wizard to guide the user through first-time setup
 * @param config Current configuration object
 * @returns Updated configuration object
 */
export async function runConfigWizard(config: ConfigData): Promise<ConfigData> {
    console.log("\n🔧 Welcome to TENEX Configuration Wizard 🔧\n");
    console.log("Let's set up your configuration for first use.\n");

    let signer: NDKPrivateKeySigner | undefined;

    // Step 0: Check if user has a Nostr key
    const { hasNostrKey } = await inquirer.prompt([
        {
            type: "confirm",
            name: "hasNostrKey",
            message: "Do you have a nostr account?",
            default: false,
        },
    ]);

    if (!hasNostrKey) {
        signer = NDKPrivateKeySigner.generate();
        ndk.signer = signer;
        
        // Ask for display name
        const { name } = await inquirer.prompt([
            {
                type: "input",
                name: "name",
                message: "What should I call you?",
                validate: (input) => input.trim().length > 0 || "Display name cannot be empty",
            },
        ]);

        publishMetadataEvent(signer, name);

        console.log("Here is your private key (nsec).");
        console.log(`\n${signer.nsec}\n`);
        console.log("Your public key (npub) is:");
        console.log(`\n${signer.npub}\n`);
        config.privateKey = signer.nsec;
    }
    
    if (hasNostrKey) {
        const { wotFrom } = await inquirer.prompt([
            {
                type: "input",
                name: "wotFrom",
                message: "Enter Web-of-trust entry point (NIP-05):",
                default: "pablo@f7z.io",
            },
        ]);

        // Validate NIP-05 and show npub
        try {
            const user = await ndk.getUserFromNip05(wotFrom);
            if (!user) {
                console.log(`⚠️ Could not verify NIP-05: ${wotFrom}`);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ Error validating NIP-05: ${errorMessage}`);
        }
        
        config.wotFrom = wotFrom;
    } else {
        config.wotFrom = "pablo@f7z.io";
    }


    // Only ask for authentication method if user already had an account
    if (hasNostrKey) {
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
                message: "Enable MCP commands?",
                choices: Object.keys(commandMap),
                default: Object.keys(commandMap),
            },
        ]);
        config.mcpCommands = selectedCommands;
    }

    // Save configuration
    writeConfig(config);

    return config;
} 