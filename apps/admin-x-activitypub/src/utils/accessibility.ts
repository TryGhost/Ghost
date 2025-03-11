interface AccessibilitySettings {
    apOnboarded?: boolean;
}

export function parseAccessibilitySettings(accessibilityString: string | null): AccessibilitySettings {
    if (!accessibilityString) {
        return {};
    }

    try {
        return JSON.parse(accessibilityString);
    } catch {
        return {};
    }
}

export function updateAccessibilitySettings(
    currentSettings: string | null,
    updates: Partial<AccessibilitySettings>
): string {
    const settings = parseAccessibilitySettings(currentSettings);
    return JSON.stringify({...settings, ...updates});
}
