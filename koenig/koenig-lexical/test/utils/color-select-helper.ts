export async function selectNamedColor(page, colorName, testId) {
    if (testId) {
        const color = page.locator(`[data-testid="${testId}"]`);
        await color.click();
    }
    const colorPicker = page.locator(`[data-testid="color-picker-${colorName}"]`);
    await colorPicker.click();
}

export async function selectCustomColor(page, color, pickerTestId) {
    if (pickerTestId) {
        const customColor = page.locator(`[data-testid="${pickerTestId}"]`);
        await customColor.click();
    }
    const customColorInput = page.locator(`[aria-label="Color value"]`);
    await customColorInput.fill(color);
}

export async function selectTitledColor(page, colorName, testId) {
    if (testId) {
        const color = page.locator(`[data-testid="${testId}"]`);
        await color.click();
    }
    const colorPicker = page.locator(`[title="${colorName}"]`);
    await colorPicker.click();
}
