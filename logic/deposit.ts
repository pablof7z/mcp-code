import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWallet } from "../lib/cache/wallets";
import { getSigner } from "../lib/nostr/utils";
import { log } from "../utils/log";

export async function deposit(username: string, amount: number) {
    try {
        const signer = await getSigner(username);
        const wallet = await getWallet(signer.pubkey, signer);

        const depositOperation = wallet?.deposit(amount);
        if (!depositOperation) {
            throw new Error(
                `Failed to initiate deposit for user ${username}. Wallet might not support deposits or user not found.`
            );
        }
        const result = await depositOperation.start();
        log(
            `Deposit of ${amount} for ${username} started successfully: ${result}`
        );

        return { qrCode: result };
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        console.error(
            `Failed to deposit ${amount} for ${username}: ${errorMessage}`
        );
        // Re-throw the error so the MCP handler can catch it
        throw new Error(`Deposit failed for ${username}: ${errorMessage}`);
    }
}

export function addDepositCommand(server: McpServer) {
    server.tool(
        "deposit",
        "Initiate a deposit for a user",
        {
            username: z.string().describe("Username to deposit for"),
            amount: z.number().describe("Amount in sats to deposit"),
        },
        async (input) => {
            const { username, amount } = input;
            log(`Received deposit request for ${username} amount ${amount}`);
            const result = await deposit(username, amount);
            if (!result || !result.qrCode) {
                throw new Error("Deposit failed to return a QR code result");
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Deposit initiated. Please scan the QR code or copy the invoice: ${result.qrCode}`,
                    },
                ],
            };
        }
    );
}
