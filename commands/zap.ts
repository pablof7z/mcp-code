import { Command } from "commander";
import { sendZap } from "../logic/zap.js";

/**
 * Register the zap command with the Commander program
 * @param program The Commander program instance
 */
export function registerZapCommand(program: Command) {
    program
        .command("zap")
        .description("Send sats to a user, event, or snippet using a NIP-60 wallet")
        .requiredOption("-a, --amount <amount>", "Amount in sats to send", Number.parseInt)
        .option("-r, --recipient <recipient>", "Recipient (username, npub, or pubkey) to zap directly")
        .option("-e, --event-id <eventId>", "Event ID to zap")
        .option("-t, --title <title>", "Snippet title to look up and zap")
        .option("-m, --message <message>", "Thank you message to include with the zap")
        .option("-u, --username <username>", "Username to zap from (uses wallet associated with this user)")
        .action(async (options) => {
            try {
                const result = await sendZap(
                    options.amount,
                    options.recipient,
                    options.eventId,
                    options.title,
                    options.message,
                    options.username
                );
                const message = result?.content?.[0]?.text;
                console.log(message || "Zap sent successfully!");
            } catch (error) {
                console.error(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });
}