import {
    type NDKEvent,
    type NDKUser,
    profileFromEvent,
} from "@nostr-dev-kit/ndk";
import { ndk } from "./ndk.js";
import { knownUsers, saveKnownUsers, saveUserProfile } from "./users.js";
import { addFollows } from "./wot.js";

export async function updateFollowList(user: NDKUser) {
    const follows = await user.followSet();
    const followsList = Array.from(follows.keys());

    // Store follows in the database
    addFollows(user.pubkey, followsList);

    const unknownUsers = new Set<string>();

    for (const follow of followsList) {
        if (!knownUsers[follow]) {
            unknownUsers.add(follow);
        }
    }

    const profilesSub = ndk.subscribe([
        { kinds: [0, 3], authors: Array.from(unknownUsers) },
    ]);

    profilesSub.on("event", (event: NDKEvent) => {
        if (event.kind === 0) handleProfileEvent(event);
        else if (event.kind === 3) handleFollowEvent(event);
    });

    profilesSub.on("eose", () => {
        saveKnownUsers();
    });
}

function handleProfileEvent(event: NDKEvent) {
    const profile = profileFromEvent(event);
    // Save directly to database instead of just updating the cache
    saveUserProfile(event.pubkey, profile, event.content);
}

function handleFollowEvent(event: NDKEvent) {
    const follows = event.tags
        .filter((tag) => tag[0] === "p")
        .map((tag) => tag[1])
        .filter(Boolean) as string[];
    addFollows(event.pubkey, follows);
}
