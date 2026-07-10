import { describe, expect, it } from "vitest";

import {
    changelogEntry,
    currentUserResponse,
    fakeAdminEndpoint,
    fakeEndpoint,
    fakeTags,
    renderAdminApp,
    type CurrentUserResponse,
} from "@test-utils/acceptance";
import { tagsScreen } from "@/tags/tags.screen";
import { whatsNewScreen } from "./whats-new.screen";

// Ported from e2e/tests/admin/whats-new.test.ts (the single-boot cases; the
// reload-shaped dismissal journeys stay in e2e). This spec is also the worked
// example for the harness escape hatches: fakeEndpoint for an external feed,
// a browseMe boot override for persisted user state, and fakeAdminEndpoint
// for capturing a non-browse admin request.

const LAST_SEEN = "2025-01-01T00:00:00.000Z";
const NEWER_THAN_LAST_SEEN = "2025-06-01T00:00:00.000Z";

/** The canned current user with what's-new preferences persisted at LAST_SEEN. */
function userWhoLastSawChangelogAt(lastSeenDate: string): CurrentUserResponse {
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({ whatsNew: { lastSeenDate } });
    return me;
}

describe("What's new banner", () => {
    it("shows no banner when the changelog feed is empty", async () => {
        // The default boot already serves an empty changelog feed.
        fakeTags([]);
        await renderAdminApp("/tags");

        // Prove absence only after the page has settled.
        await expect.element(tagsScreen.emptyStateHeading()).toBeVisible();
        await expect.element(whatsNewScreen.banner()).not.toBeInTheDocument();
    });

    it("shows the banner when an entry is newer than the user's last seen date", async () => {
        fakeTags([]);
        fakeEndpoint("GET", "https://ghost.org/changelog.json", {
            posts: [
                changelogEntry({
                    title: "New Update",
                    custom_excerpt: "This is an exciting new feature",
                    published_at: NEWER_THAN_LAST_SEEN,
                }),
            ],
        });
        await renderAdminApp("/tags", {
            boot: { browseMe: { response: userWhoLastSawChangelogAt(LAST_SEEN) } },
        });

        await expect.element(whatsNewScreen.banner()).toBeVisible();
        await expect.element(whatsNewScreen.bannerTitle()).toHaveTextContent("New Update");
        await expect.element(whatsNewScreen.bannerExcerpt()).toHaveTextContent("This is an exciting new feature");
    });

    it("dismissing the banner persists the entry's date as last seen", async () => {
        fakeTags([]);
        fakeEndpoint("GET", "https://ghost.org/changelog.json", {
            posts: [changelogEntry({ published_at: NEWER_THAN_LAST_SEEN })],
        });
        // Capture the preferences write; `({body}) => body` echoes the PUT
        // like the boot table does, so the client's write persists.
        const prefsApi = fakeAdminEndpoint("PUT", /^\/users\/\w+\//, ({ body }) => body);
        await renderAdminApp("/tags", {
            boot: { browseMe: { response: userWhoLastSawChangelogAt(LAST_SEEN) } },
        });

        await expect.element(whatsNewScreen.banner()).toBeVisible();
        await whatsNewScreen.dismissButton().click();

        await expect.element(whatsNewScreen.banner()).not.toBeInTheDocument();
        await expect
            .poll(() => {
                const body = prefsApi.lastRequest?.body as { users: Array<{ accessibility: string }> } | undefined;
                if (!body) {
                    return undefined;
                }
                const preferences = JSON.parse(body.users[0].accessibility) as { whatsNew?: { lastSeenDate?: string } };
                return preferences.whatsNew?.lastSeenDate;
            })
            .toBe(NEWER_THAN_LAST_SEEN);
    });
});
