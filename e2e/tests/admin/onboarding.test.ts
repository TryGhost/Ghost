import {AnalyticsOverviewPage, OnboardingPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import type {Page} from '@playwright/test';

type ChecklistState = 'pending' | 'started' | 'completed' | 'dismissed';

const allSteps = ['customize-design', 'first-post', 'build-audience', 'share-publication'];
const activeStartedAt = '2026-05-01T00:00:00.000Z';
const navigationSteps: Array<[string, RegExp]> = [
    ['customize-design', /\/ghost\/#\/settings\/design\/edit\?ref=setup/],
    ['first-post', /\/ghost\/#\/editor\/post/],
    ['build-audience', /\/ghost\/#\/members/]
];

test.use({isolation: 'per-test'});

async function getCurrentUser(page: Page) {
    const response = await page.request.get('/ghost/api/admin/users/me/?include=roles');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    return body.users[0];
}

async function setOnboardingState(page: Page, checklistState: ChecklistState, completedSteps: string[] = [], startedAt: string | null | undefined = checklistState === 'started' ? activeStartedAt : undefined) {
    const user = await getCurrentUser(page);
    const preferences = user.accessibility ? JSON.parse(user.accessibility) : {};

    preferences.onboarding = {
        completedSteps,
        checklistState
    };

    if (startedAt) {
        preferences.onboarding.startedAt = startedAt;
    }

    const response = await page.request.put(`/ghost/api/admin/users/${user.id}/?include=roles`, {
        data: {
            users: [{
                ...user,
                accessibility: JSON.stringify(preferences)
            }]
        }
    });
    expect(response.ok()).toBe(true);

    await page.reload({waitUntil: 'load'});
}

async function getOnboardingPreferences(page: Page) {
    const user = await getCurrentUser(page);
    const preferences = user.accessibility ? JSON.parse(user.accessibility) : {};

    return preferences.onboarding;
}

async function expectOnboardingRoute(page: Page, {returnTo = '/analytics'}: {returnTo?: string} = {}) {
    await expect(page).toHaveURL((url) => {
        const hashUrl = new URL(url.hash.slice(1), 'http://ghost.local');

        return hashUrl.pathname === '/setup/onboarding' && hashUrl.searchParams.get('returnTo') === returnTo;
    });
}

async function startOnboarding(page: Page) {
    await setOnboardingState(page, 'started');
    await page.goto(`/ghost/?onboardingTest=${Date.now()}#/setup/onboarding?returnTo=%2Fanalytics`);

    const onboardingPage = new OnboardingPage(page);
    await expect(onboardingPage.checklist).toBeVisible();
}

test.describe('Ghost Admin - Onboarding Checklist', () => {
    test('new owner setup flow lands on onboarding', async ({page}) => {
        await setOnboardingState(page, 'pending', ['customize-design']);

        await page.goto('/ghost/#/setup/done');

        const onboardingPage = new OnboardingPage(page);
        await expect(onboardingPage.checklist).toBeVisible();
        await expectOnboardingRoute(page);

        const preferences = await getOnboardingPreferences(page);
        expect(preferences).toMatchObject({
            checklistState: 'started',
            completedSteps: []
        });
        expect(typeof preferences.startedAt).toBe('string');
    });

    test('analytics routes redirect to onboarding while active', async ({page}) => {
        await startOnboarding(page);

        await page.goto('/ghost/#/analytics');

        let onboardingPage = new OnboardingPage(page);
        await expect(onboardingPage.checklist).toBeVisible();
        await expectOnboardingRoute(page);

        await page.goto('/ghost/#/analytics/web');

        onboardingPage = new OnboardingPage(page);
        await expect(onboardingPage.checklist).toBeVisible();
        await expectOnboardingRoute(page, {returnTo: '/analytics/web'});
    });

    test('completed and dismissed users reach Analytics normally', async ({page}) => {
        const analyticsPage = new AnalyticsOverviewPage(page);

        await setOnboardingState(page, 'completed', allSteps);
        await analyticsPage.goto();
        await expect(analyticsPage.header).toBeVisible();

        await setOnboardingState(page, 'dismissed');
        await analyticsPage.goto();
        await expect(analyticsPage.header).toBeVisible();
    });

    test('pending users reach Analytics normally and are not started by the React route', async ({page}) => {
        const analyticsPage = new AnalyticsOverviewPage(page);

        await setOnboardingState(page, 'pending', ['customize-design']);
        await analyticsPage.goto();
        await expect(analyticsPage.header).toBeVisible();

        await page.goto('/ghost/#/setup/onboarding?returnTo=%2Fanalytics%3Fsource%3Dweb');
        await expect(page).toHaveURL(/\/ghost\/#\/analytics\?source=web$/);

        const preferences = await getOnboardingPreferences(page);
        expect(preferences).toMatchObject({
            checklistState: 'pending',
            completedSteps: ['customize-design']
        });
    });

    test('legacy started users without startedAt reach Analytics and are dismissed', async ({page}) => {
        const analyticsPage = new AnalyticsOverviewPage(page);

        await setOnboardingState(page, 'started', [], null);
        await analyticsPage.goto();

        await expect(analyticsPage.header).toBeVisible();

        await expect.poll(async () => {
            return (await getOnboardingPreferences(page))?.checklistState;
        }).toBe('dismissed');

        await expect.poll(async () => {
            return (await getOnboardingPreferences(page))?.completedSteps;
        }).toEqual([]);
    });

    navigationSteps.forEach(([step, expectedUrl]) => {
        test(`${step} step marks complete and navigates`, async ({page}) => {
            await startOnboarding(page);

            const onboardingPage = new OnboardingPage(page);
            await onboardingPage.step(step).click();

            await expect(page).toHaveURL(expectedUrl);

            const preferences = await getOnboardingPreferences(page);
            expect(preferences.completedSteps).toContain(step);
        });
    });

    test('share step opens the dialog and marks the step complete', async ({page}) => {
        await startOnboarding(page);

        const onboardingPage = new OnboardingPage(page);
        await onboardingPage.step('share-publication').click();

        await expect(onboardingPage.shareModal).toBeVisible();

        const preferences = await getOnboardingPreferences(page);
        expect(preferences.completedSteps).toContain('share-publication');
    });

    test('skip returns to the preserved analytics URL', async ({page}) => {
        await startOnboarding(page);
        await page.goto('/ghost/#/analytics?source=web');

        const onboardingPage = new OnboardingPage(page);
        await expectOnboardingRoute(page, {returnTo: '/analytics?source=web'});
        await onboardingPage.skipButton.click();

        await expect(page).toHaveURL(/\/ghost\/#\/analytics\?source=web$/);

        const preferences = await getOnboardingPreferences(page);
        expect(preferences.checklistState).toBe('dismissed');
    });

    test('completing all steps returns to the preserved analytics URL', async ({page}) => {
        await startOnboarding(page);
        await setOnboardingState(page, 'started', allSteps);
        await page.goto('/ghost/#/setup/onboarding?returnTo=%2Fanalytics%3Fsource%3Dweb');

        const onboardingPage = new OnboardingPage(page);
        await expectOnboardingRoute(page, {returnTo: '/analytics?source=web'});
        await onboardingPage.completeButton.click();

        await expect(page).toHaveURL(/\/ghost\/#\/analytics\?source=web$/);

        const preferences = await getOnboardingPreferences(page);
        expect(preferences.checklistState).toBe('completed');
    });
});
