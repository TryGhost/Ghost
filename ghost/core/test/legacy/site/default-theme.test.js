const assert = require('node:assert/strict');
const {mockSetting} = require('../../utils/e2e-framework-mock-manager');

// This test checks if the default theme passes the current gscan version
// If this test fails, check the used gscan version in Ghost
it('Default theme passes linked gscan version', async function () {
    const themeService = require('../../../core/server/services/themes');

    // Set active theme name
    mockSetting('active_theme', 'source');
    await themeService.init();
    const theme = await themeService.api.getThemeErrors('source');
    assert.deepEqual(theme.errors, [], 'Default theme should have no errors');
});
