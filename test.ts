import NDK, { NDKPrivateKeySigner, NDKKind } from "@nostr-dev-kit/ndk";
import { NDKCashuWallet, NDKWalletStatus } from "@nostr-dev-kit/ndk-wallet";

const ndk = new NDK({ explicitRelayUrls: ["wss://relay.primal.net"] });
ndk.signer = NDKPrivateKeySigner.generate();

/**
 * Example function to set up an NDKCashuWallet
 */
async function setupCashuWallet(ndk: NDK, mints: string[]) {
    // Create the Cashu wallet instance
    const wallet = new NDKCashuWallet(ndk);

    // Add mints to the wallet
    for (const mint of mints) {
        wallet.mints.push(mint);
    }

    // Generate or load a p2pk (Pay-to-Public-Key) token
    // This is used for receiving payments with NIP-61 (nutzaps)
    const p2pk = await wallet.getP2pk();
    console.log(`Wallet p2pk: ${p2pk}`);

    // Set up event listeners
    wallet.on("ready", () => {
        console.log("Cashu wallet is ready");
    });

    wallet.on("balance_updated", (balance) => {
        console.log(`Wallet balance updated: ${balance?.amount} sats`);
        // You might want to update your UI here
    });

    // Start the wallet - this will load the state of the wallet and begin monitoring for events
    wallet.start();

    // Assign to NDK instance for integration with other NDK features
    ndk.wallet = wallet;

    return wallet;
}

/**
 * Get balance for a specific mint
 */
function getMintBalance(wallet: NDKCashuWallet, mintUrl: string) {
    const balance = wallet.mintBalance(mintUrl);
    console.log(`Balance for mint ${mintUrl}: ${balance} sats`);
    return balance;
}

/**
 * Check if the user already has a nutsack (NIP-60) wallet.
 **/
async function findExistingWallet(
    ndk: NDK
): Promise<NDKCashuWallet | undefined> {
    const activeUser = ndk.activeUser;

    if (!activeUser) throw "we need a user first, set a signer in ndk";

    const event = await ndk.fetchEvent([
        { kinds: [NDKKind.CashuWallet], authors: [activeUser.pubkey] },
    ]);

    // if we receive a CashuWallet event we load the wallet
    if (event) return await NDKCashuWallet.from(event);
}

/**
 * Example usage
 */
async function main() {
    // we assume ndk is already connected and ready
    // ...

    let wallet: NDKCashuWallet | undefined;

    wallet = await findExistingWallet(ndk);

    // if we don't have a wallet, we create one
    if (!wallet) {
        // List of mints to use
        const mints = ["https://8333.space:3338"];

        // Setup the wallet
        wallet = await setupCashuWallet(ndk, mints);
    }

    // Example: Check wallet balance
    const totalBalance = wallet.balance?.amount || 0;
    console.log(`Total wallet balance: ${totalBalance} sats`);

    // Example: Need to fund wallet?
    // See the Cashu Deposits snippet for funding your wallet with lightning

    // Example: Get balance for specific mint
    for (const mint of mints) {
        getMintBalance(wallet, mint);
    }

    // Note: For monitoring nutzaps, see the Nutzap Monitor snippet

    // Keep the connection open for monitoring
    // In a real app, you'd use proper lifecycle management
}

setTimeout(main, 2500);
