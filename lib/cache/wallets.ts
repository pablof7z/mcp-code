import { NDKCashuWallet, NDKNutzapMonitor } from "@nostr-dev-kit/ndk-wallet";
import { NDKCashuMintList, NDKPrivateKeySigner, type NDKSigner } from "@nostr-dev-kit/ndk";
import { ndk } from "../../ndk.js";
import { log } from "../utils/log.js";

/**
 * In-memory cache to store NDKCashuWallets by pubkey for efficient retrieval
 * Used by the zap command to avoid repeatedly fetching wallet events
 */
export const walletsCache: Record<string, NDKCashuWallet> = {};

/**
 * Get a wallet for a pubkey, retrieving from cache if available,
 * otherwise loading from Nostr
 * @param pubkey The public key to get the wallet for
 * @returns The wallet (from cache or newly loaded)
 */
export async function getWallet(pubkey: string, signer: NDKSigner): Promise<NDKCashuWallet | undefined> {
    // Return from cache if available
    if (walletsCache[pubkey]) {
        console.log(`Returning cached wallet for ${pubkey}`);
        return walletsCache[pubkey];
    }

    ndk.signer = signer;
    
    // Not in cache, fetch from Nostr
    try {
        let wallet: NDKCashuWallet | undefined;
        const user = ndk.getUser({pubkey});
        const event = await ndk.fetchEvent({ kinds: [17375], authors: [pubkey] });

        // Use the existing wallet
        if (event) {
            console.log(`Found wallet event for ${pubkey}: ${event.id}`, event.inspect);
            wallet = await NDKCashuWallet.from(event);
        } else {
            console.log('No wallet event found for', pubkey);
        }

        if (!wallet) {
            wallet = new NDKCashuWallet(ndk);
            wallet.mints = ["https://mint.coinos.io"];

            // Generate a P2PK address for receiving nutzaps
            await wallet.getP2pk();
            log(`Generated P2PK address for ${pubkey}: ${wallet.p2pk}`);
            
            // Publish the wallet info event (kind 17375)
            await wallet.publish();
            log(`Published wallet info event for ${pubkey}`);
            
            // Set up the mint list for nutzap reception (kind 10019)
            const mintList = new NDKCashuMintList(ndk);
            mintList.mints = wallet.mints;
            mintList.relays = ['wss://relay.pri']
            mintList.p2pk = wallet.p2pk;
            
            // Publish the mint list
            await mintList.publish();
            log(`Published mint list for ${pubkey} with mints: ${mintList.mints.join(', ')}`);
        }
        
        
        // Start wallet for monitoring balance and nutzaps
        console.log(`Starting wallet for ${pubkey}`);
        await wallet.start();
        console.log(`Wallet started for ${pubkey}: ${wallet.balance}`);
        log(`Started wallet for ${pubkey}: ${wallet.balance}`);

        try {
            const nutzapMonitor = new NDKNutzapMonitor(ndk, user, {});
            nutzapMonitor.wallet = wallet;
            nutzapMonitor.on("seen", () => {
                log('seen nutzap');
            });
            nutzapMonitor.on("redeemed", (events) => {
                log(`Nutzap redeemed for ${pubkey}: ${events.reduce((acc, event) => acc + event.amount, 0)} sats`);
            });
            nutzapMonitor.start({});
            log(`Started nutzap monitor for ${pubkey}`);
            
            // Set up balance update listener
            wallet.on('balance_updated', (newBalance) => {
                log(`Balance updated for ${pubkey}: ${newBalance?.amount || 0} sats`);
            });
        } catch (error) {
            console.error(`Error starting nutzap monitor for ${pubkey}:`, error);
        }
        
        walletsCache[pubkey] = wallet;
        
        // No wallet found
        return wallet;
    } catch (error) {
        console.error(`Error fetching wallet for ${pubkey}:`, error);
        return undefined;
    }
}

/**
 * Clear the wallet cache for testing or memory management
 */
export function clearWalletsCache(): void {
    for (const key of Object.keys(walletsCache)) {
        delete walletsCache[key];
    }
}