import NDK, {
    NDKPrivateKeySigner,
    type NDKUser,
    type NDKSigner,
} from "@nostr-dev-kit/ndk";
import { NDKNip46Signer } from "@nostr-dev-kit/ndk";
import { type ConfigData, writeConfig } from "./config";
import { updateFollowList } from "./update-follow-list";

const DEFAULT_RELAYS = [
    "wss://relay.primal.net",
    "wss://relay.damus.io",
    "wss://nos.lol",
];

// Initialize NDK with signer
export const ndk = new NDK();

export async function initNDK(config: ConfigData) {
    ndk.explicitRelayUrls = config.relays || DEFAULT_RELAYS;
    await ndk.connect();

    let signer: NDKSigner;

    if (config.bunker) {
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
    } else if (config.privateKey) {
        signer = new NDKPrivateKeySigner(config.privateKey);
    } else {
        throw new Error("No private key or bunker provided");
    }

    ndk.signer = signer;

    let mainUser: NDKUser;

    if (config.wotFrom) {
        const u = await ndk.getUserFromNip05(config.wotFrom);
        if (u) mainUser = u;
    }

    mainUser ??= await signer.user();

    setTimeout(() => updateFollowList(mainUser), 1000);
}
