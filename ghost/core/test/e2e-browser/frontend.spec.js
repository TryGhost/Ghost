const {expect, test} = require('@playwright/test');
const testUtils = require('../utils');
const express = require('express');

let siteUrl = process.env.TEST_URL || 'http://localhost:2368';

test.describe('Ghost frontend', function () {
    test.beforeAll(async function () {
        const app = await testUtils.startGhost();
    });

    test.afterAll(async () => {
        await testUtils.stopGhost();
    });

    test('Loads the homepage', async ({page}) => {
        const response = await page.goto(siteUrl);
        expect(response.status()).toEqual(200);
    });
});
