import {test, expect} from '@playwright/test';

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
}

const SCREENS: Screen[] = [
    // Core screens
    {name: 'dashboard', path: '/ghost/#/dashboard'},
    {name: 'posts-list', path: '/ghost/#/posts'},
    {name: 'pages-list', path: '/ghost/#/pages'},
    {name: 'tags-list', path: '/ghost/#/tags'},
    {name: 'members-list', path: '/ghost/#/members'},

    // Editor
    {name: 'editor-new-post', path: '/ghost/#/editor/post', extraWait: 2000},

    // Settings
    {name: 'settings', path: '/ghost/#/settings'},

    // Stats / Analytics
    {name: 'stats', path: '/ghost/#/stats', extraWait: 1000},

    // ActivityPub
    {name: 'activitypub', path: '/ghost/#/activitypub', extraWait: 1000}
];

/** CSS injected into every page to hide flaky dynamic content */
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
`;

for (const screen of SCREENS) {
    test(`visual baseline: ${screen.name}`, async ({page}) => {
        await page.goto(screen.path);
        await page.waitForLoadState('load');

        // Wait for specific element if configured
        if (screen.waitFor) {
            await page.waitForSelector(screen.waitFor, {timeout: 15_000});
        }

        // Extra settle time for complex screens (charts, etc.)
        if (screen.extraWait) {
            await page.waitForTimeout(screen.extraWait);
        }

        // Inject CSS to hide dynamic/flaky content
        await page.addStyleTag({content: HIDE_DYNAMIC_CONTENT});

        // Small settle after style injection
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(`${screen.name}.png`, {
            fullPage: true,
            maxDiffPixelRatio: 0.001
        });
    });
}
