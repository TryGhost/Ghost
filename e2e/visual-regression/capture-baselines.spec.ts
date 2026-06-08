import {expect, test} from '@playwright/test';

/**
 * Visual regression baselines for Ghost Admin.
 *
 * Each test navigates to a Ghost Admin screen, hides dynamic content
 * (timestamps, notifications, avatars, animations) so they don't cause
 * false diffs, and captures a full-page screenshot.
 *
 * Usage:
 *   # Generate / update baselines (run on main branch BEFORE migration)
 *   npx playwright test -c e2e/visual-regression --update-snapshots
 *
 *   # Compare against baselines (run AFTER migration changes)
 *   npx playwright test -c e2e/visual-regression
 */

interface Screen {
    name: string;
    path: string;
    /** Optional selector to wait for before screenshotting */
    waitFor?: string;
    /** Extra time to wait after load (ms) — use sparingly */
    extraWait?: number;
    /** If true, capture viewport-only screenshot instead of full page */
    viewportOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Full-page screens
// ---------------------------------------------------------------------------
const SCREENS: Screen[] = [
    // Core Ember pages (HIGH risk — CSS class collisions with .flex, .hidden, etc.)
    {name: 'dashboard', path: '/ghost/#/dashboard'},
    {name: 'posts-list', path: '/ghost/#/posts'},
    {name: 'pages-list', path: '/ghost/#/pages'},
    {name: 'tags-list', path: '/ghost/#/tags'},
    {name: 'tags-new', path: '/ghost/#/tags/new', extraWait: 1000},
    {name: 'members-list', path: '/ghost/#/members'},
    {name: 'members-activity', path: '/ghost/#/members-activity', extraWait: 1000},

    // Editor
    {name: 'editor-new-post', path: '/ghost/#/editor/post', extraWait: 2000},

    // Settings (full page — captures top portion)
    {name: 'settings', path: '/ghost/#/settings'},

    // Analytics / Stats pages (React)
    {name: 'analytics-overview', path: '/ghost/#/stats', extraWait: 1500},
    {name: 'analytics-web', path: '/ghost/#/stats/web', extraWait: 1500},
    {name: 'analytics-growth', path: '/ghost/#/stats/growth', extraWait: 1500},
    {name: 'analytics-newsletters', path: '/ghost/#/stats/newsletters', extraWait: 1500},

    // ActivityPub pages (React)
    {name: 'activitypub-inbox', path: '/ghost/#/activitypub', extraWait: 1500},
    {name: 'activitypub-feed', path: '/ghost/#/activitypub/feed', extraWait: 1500},
    {name: 'activitypub-profile', path: '/ghost/#/activitypub/profile', extraWait: 1500},
    {name: 'activitypub-notifications', path: '/ghost/#/activitypub/notifications', extraWait: 1500}
];

// ---------------------------------------------------------------------------
// Settings sections — scrolled into view individually
// ---------------------------------------------------------------------------
interface SettingsSection {
    name: string;
    /** The data-testid attribute on the section's TopLevelGroup */
    testId: string;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
    // General
    {name: 'settings-title-description', testId: 'title-and-description'},
    {name: 'settings-timezone', testId: 'timezone'},
    {name: 'settings-publication-language', testId: 'publication-language'},
    {name: 'settings-staff', testId: 'users'},
    {name: 'settings-social-accounts', testId: 'social-accounts'},

    // Site
    {name: 'settings-design', testId: 'design'},
    {name: 'settings-theme', testId: 'theme'},
    {name: 'settings-navigation', testId: 'navigation'},
    {name: 'settings-announcement-bar', testId: 'announcement-bar'},

    // Membership
    {name: 'settings-portal', testId: 'portal'},
    {name: 'settings-tiers', testId: 'tiers'},
    {name: 'settings-analytics', testId: 'analytics'},

    // Email newsletters
    {name: 'settings-enable-newsletters', testId: 'enable-newsletters'},
    {name: 'settings-newsletters', testId: 'newsletters'},
    {name: 'settings-default-recipients', testId: 'default-recipients'},
    {name: 'settings-mailgun', testId: 'mailgun'},

    // Growth
    {name: 'settings-recommendations', testId: 'recommendations'},
    {name: 'settings-embed-signup-form', testId: 'embed-signup-form'},

    // Advanced
    {name: 'settings-integrations', testId: 'integrations'},
    {name: 'settings-migration', testId: 'migrationtools'},
    {name: 'settings-code-injection', testId: 'code-injection'},
    {name: 'settings-labs', testId: 'labs'},
    {name: 'settings-history', testId: 'history'}
];

// ---------------------------------------------------------------------------
// CSS injected into every page to hide flaky dynamic content
// ---------------------------------------------------------------------------
const HIDE_DYNAMIC_CONTENT = `
    /* Timestamps and relative dates */
    [data-testid="timestamp"],
    [data-test-date],
    time,
    .gh-content-entry-date,
    .gh-members-list-joined,
    .gh-post-list-updated,
    .gh-post-list-date {
        visibility: hidden !important;
    }

    /* Notifications and toasts */
    .gh-notification,
    .gh-alerts,
    [data-testid="toast"] {
        display: none !important;
    }

    /* Animations and transitions */
    *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
    }

    /* Avatars (can vary between runs) */
    .gh-member-avatar img,
    .gh-author-avatar img {
        visibility: hidden !important;
    }

    /* Loading spinners */
    .gh-loading-spinner,
    .gh-loading-orb {
        display: none !important;
    }

    /* Charts and graphs (data-dependent, flaky) */
    .recharts-surface,
    .recharts-wrapper,
    canvas {
        visibility: hidden !important;
    }

    /* Scrollbars (platform-dependent rendering) */
    ::-webkit-scrollbar {
        display: none !important;
    }
    * {
        scrollbar-width: none !important;
    }

    /* Editor carets and cursors */
    .koenig-cursor,
    .ProseMirror .ProseMirror-cursor,
    [data-lexical-editor] .cursor,
    .kg-prose caret-color {
        caret-color: transparent !important;
    }
`;

// ---------------------------------------------------------------------------
// Full-page screen tests
// ---------------------------------------------------------------------------
for (const screen of SCREENS) {
    test(`visual baseline: ${screen.name}`, async ({page}) => {
        await page.goto(screen.path);
        await page.waitForLoadState('load');

        if (screen.waitFor) {
            await page.waitForSelector(screen.waitFor, {timeout: 15_000});
        }

        if (screen.extraWait) {
            await page.waitForTimeout(screen.extraWait);
        }

        await page.addStyleTag({content: HIDE_DYNAMIC_CONTENT});
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(`${screen.name}.png`, {
            fullPage: !screen.viewportOnly,
            maxDiffPixelRatio: 0.001
        });
    });
}

// ---------------------------------------------------------------------------
// Settings section tests — scroll to each section and capture viewport
// ---------------------------------------------------------------------------
test.describe('settings sections', () => {
    for (const section of SETTINGS_SECTIONS) {
        test(`visual baseline: ${section.name}`, async ({page}) => {
            await page.goto('/ghost/#/settings');
            await page.waitForLoadState('load');

            // Wait for Settings React app to mount
            await page.waitForSelector('[data-testid="title-and-description"]', {timeout: 15_000});

            // Extra settle time for settings to fully render
            await page.waitForTimeout(1500);

            await page.addStyleTag({content: HIDE_DYNAMIC_CONTENT});

            // Scroll the section into view within the settings scroller
            const scrolled = await page.evaluate((testId) => {
                const sectionEl = document.querySelector(`[data-testid="${testId}"]`);
                if (!sectionEl) {
                    return false;
                }
                sectionEl.scrollIntoView({block: 'start'});
                return true;
            }, section.testId);

            if (!scrolled) {
                // Section might not exist (conditional on config like Stripe)
                test.skip();
                return;
            }

            // Allow scroll + re-render to settle
            await page.waitForTimeout(500);

            await expect(page).toHaveScreenshot(`${section.name}.png`, {
                fullPage: false,
                maxDiffPixelRatio: 0.001
            });
        });
    }
});
