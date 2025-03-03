export async function cardBackgroundColorSettings(page, {cardColorPickerTestId, customColor, colorTestId, findByColorTitle, imageUploadId, fireColorSetting = true}) {
    if (fireColorSetting) {
        const colorSetting = page.locator(`[data-testid="${cardColorPickerTestId}"]`);
        const colorButton = colorSetting.locator('button');
        await colorButton.click();
    }

    if (findByColorTitle) {
        const colorTitle = page.locator(`[title="${findByColorTitle}"]`);
        await colorTitle.click();
    }

    if (customColor) {
        const picker = page.locator(`[data-testid="color-picker-toggle"]`);
        await picker.click();
        const colorInput = page.locator(`input[aria-label="Color value"]`);
        await colorInput.click({clickCount: 3});
        await colorInput.type(customColor);
    }

    if (colorTestId) {
        await page.locator(`[data-test-id="${colorTestId}"]`).click();
    }

    if (imageUploadId) {
        await page.locator(`[data-testid="${imageUploadId}"]`).click();
    }
}
