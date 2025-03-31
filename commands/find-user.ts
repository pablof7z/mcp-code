import { Command } from "commander";
import { toPubkeys, formatUser } from "../lib/converters/index.js";

// Create a command for finding a user
const findUserCommand = new Command("find-user")
    .description("Find a user by name, npub, or other profile information")
    .argument("<query>", "The search query to find a user")
    .action(async (query: string) => {
        try {
            // Find matching pubkeys
            const pubkeys = toPubkeys(query);
            
            if (pubkeys.length === 0) {
                console.log(`No users found matching query: ${query}`);
                return;
            }

            // Format and display each matching user
            console.log(`Found ${pubkeys.length} matching users:`);
            for (let i = 0; i < pubkeys.length; i++) {
                if (i > 0) console.log("\n---\n");
                const pubkey = pubkeys[i];
                if (pubkey) {
                    console.log(formatUser(pubkey));
                }
            }
        } catch (error) {
            console.error("Error:", error);
        }
    });

export default findUserCommand; 