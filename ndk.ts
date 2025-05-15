import NDK, {
    NDKPrivateKeySigner,
    type NDKUser,
    type NDKSigner,
    type NDKRelay,
} from "@nostr-dev-kit/ndk";
import { NDKNip46Signer } from "@nostr-dev-kit/ndk";
import { type ConfigData, writeConfig } from "./config.js";
import { log } from "./lib/utils/log.js";

const DEFAULT_RELAYS = [
    "wss://relay.primal.net",
    "wss://relay.damus.io",
    "wss://purplepag.es",
    "wss://relay.nostr.band",
];

// Initialize NDK with signer
export const ndk = new NDK();

export async function initNDK(config?: ConfigData) {
    ndk.explicitRelayUrls = config?.relays || DEFAULT_RELAYS;
    ndk.pool.on("relay:connect", (r: NDKRelay) => log(`Connected to ${r.url}`));
    ndk.pool.on("relay:disconnect", (r: NDKRelay) =>
        log(`Disconnected from ${r.url}`)
    );
    ndk.pool.on("relay:connecting", (r: NDKRelay) =>
        log(`Connecting to ${r.url}`)
    );
    await ndk.connect();

    let signer: NDKSigner | undefined;

    if (config?.bunker) {
        let localSigner: NDKPrivateKeySigner;
        if (config.bunkerLocalKey) {
            localSigner = new NDKPrivateKeySigner(config.bunkerLocalKey);
        } else {
            localSigner = NDKPrivateKeySigner.generate();

            // save it to the config
            config.bunkerLocalKey = localSigner.privateKey;
            writeConfig(config);
        }

        signer = new NDKNip46Signer(ndk, config.bunker, localSigner);
        await signer.blockUntilReady();
    } else if (config?.privateKey) {
        signer = new NDKPrivateKeySigner(config.privateKey);
    }

    if (signer) ndk.signer = signer;

    let mainUser: NDKUser | undefined;

    if (config?.wotFrom) {
        const u = await ndk.getUserFromNip05(config.wotFrom);
        if (u) mainUser = u;
    }

    mainUser ??= await signer?.user();

    // setTimeout(() => updateFollowList(mainUser), 1000);
}
