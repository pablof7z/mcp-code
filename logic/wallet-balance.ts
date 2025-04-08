import { z } from "zod";
import { getUser } from "../config.js";
import { getWallet } from "../lib/cache/wallets.js";
import { getSigner } from "../lib/nostr/utils.js";
import { log } from "../lib/utils/log.js";
import { ndk } from "../ndk.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Get the balance for a user's wallet
 * @param username Username to check balance for
 * @returns Balance information
 */
export async function getWalletBalance(username: string): Promise<{
    balance: number;
    mint_balances: Record<string, number>;
    message: string;
}> {
    try {
        // Get the appropriate signer based on username
        const signer = await getSigner(username);
        
        // Set the signer for this operation
        ndk.signer = signer;

        const user = await signer.user();
        const pubkey = user.pubkey;
        
        // Get wallet for the pubkey
        const wallet = await getWallet(pubkey, signer);
        if (!wallet) {
            throw new Error(`No wallet found for ${username}`);
        }
        
        // Get wallet balance
        const totalBalance = wallet.balance?.amount || 0;
        log(`Wallet balance for ${username}: ${totalBalance} sats`);
        
        // Get individual mint balances
        const mintBalances: Record<string, number> = {};
        for (const [mintUrl, balance] of Object.entries(wallet.mintBalances)) {
            mintBalances[mintUrl] = balance;
            log(`  - ${mintUrl}: ${balance} sats`);
        }
        
        return {
            balance: totalBalance,
            mint_balances: mintBalances,
            message: `Wallet balance for ${username}: ${totalBalance} sats`,
        };
    } catch (error: unknown) {
        const errorMessage = 
            error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to get wallet balance: ${errorMessage}`);
    }
}

/**
 * Add the wallet-balance command to the MCP server
 * @param server MCP server to add the command to
 */
export function addWalletBalanceCommand(server: McpServer) {
    server.tool(
        "wallet_balance",
        "Get the balance of a user's wallet",
        {
            username: z.string().describe("Username to check balance for"),
        },
        async ({ username }) => {
            const result = await getWalletBalance(username);
            
            return {
                content: [
                    {
                        type: "text",
                        text: result.message,
                    },
                ],
                // Include detailed balance information in the response
                wallet_balance: {
                    total: result.balance,
                    mints: result.mint_balances,
                },
            };
        }
    );
}