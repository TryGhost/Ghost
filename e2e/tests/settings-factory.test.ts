import {test, expect} from '../helpers/playwright';
import {createSettingsFactory} from '../data-factory';
import type {SettingsFactory} from '../data-factory';

test.describe('Settings Factory API Integration', () => {
    let settingsFactory: SettingsFactory;

    test.beforeEach(async ({page}) => {
        settingsFactory = createSettingsFactory(page);
    });

    test('fetch all settings from the API', async () => {
        const response = await settingsFactory.fetch();

        expect(response.settings).toBeDefined();
        expect(Array.isArray(response.settings)).toBe(true);
        expect(response.settings.length).toBeGreaterThan(0);

        // Verify settings have the expected structure
        const firstSetting = response.settings[0];
        expect(firstSetting).toHaveProperty('key');
        expect(firstSetting).toHaveProperty('value');
    });

    test('get a specific setting by key', async () => {
        const title = await settingsFactory.getSetting('title');

        expect(title).toBeDefined();
        expect(typeof title).toBe('string');
    });

    test('update a single setting', async () => {
        const originalTitle = await settingsFactory.getSetting('title');
        const newTitle = `Test Site ${Date.now()}`;

        // Update the title
        const response = await settingsFactory.update([{
            key: 'title',
            value: newTitle
        }]);

        // Verify the response contains all settings
        expect(response.settings).toBeDefined();
        const updatedTitle = response.settings.find(s => s.key === 'title');
        expect(updatedTitle?.value).toBe(newTitle);

        // Verify we can fetch the updated value
        const fetchedTitle = await settingsFactory.getSetting('title');
        expect(fetchedTitle).toBe(newTitle);

        // Restore original title
        await settingsFactory.update([{
            key: 'title',
            value: originalTitle as string
        }]);
    });

    test('get current labs flags', async () => {
        const labs = await settingsFactory.getLabs();

        expect(labs).toBeDefined();
        expect(typeof labs).toBe('object');
    });

    test('toggle labs flag on and off', async () => {
        // Use a flag that's safe to toggle for testing
        const testFlag = 'importMemberTier';

        // Get current state
        const initialLabs = await settingsFactory.getLabs();
        const initialState = initialLabs[testFlag] || false;

        // Toggle to opposite state
        await settingsFactory.updateLabs({[testFlag]: !initialState});

        // Verify it changed
        let updatedLabs = await settingsFactory.getLabs();
        expect(updatedLabs[testFlag]).toBe(!initialState);

        // Toggle back to original state
        await settingsFactory.updateLabs({[testFlag]: initialState});

        // Verify it's back to original
        updatedLabs = await settingsFactory.getLabs();
        expect(updatedLabs[testFlag]).toBe(initialState);
    });

    test('update multiple settings at once', async () => {
        const originalTitle = await settingsFactory.getSetting('title');
        const originalDescription = await settingsFactory.getSetting('description');

        const newTitle = `Multi Update Test ${Date.now()}`;
        const newDescription = 'Testing multiple settings update';

        // Update multiple settings
        await settingsFactory.update([
            {key: 'title', value: newTitle},
            {key: 'description', value: newDescription}
        ]);

        // Verify both were updated
        const updatedTitle = await settingsFactory.getSetting('title');
        const updatedDescription = await settingsFactory.getSetting('description');

        expect(updatedTitle).toBe(newTitle);
        expect(updatedDescription).toBe(newDescription);

        // Restore original values
        await settingsFactory.update([
            {key: 'title', value: originalTitle as string},
            {key: 'description', value: originalDescription as string}
        ]);
    });
});
