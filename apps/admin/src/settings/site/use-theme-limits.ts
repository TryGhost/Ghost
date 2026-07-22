import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

/**
 * Custom-theme host limit checks, ported from the legacy
 * use-check-theme-limit-error hook. The customThemes limit is a pure
 * allowlist (no counts to fetch), so the check reduces to config data:
 * limit-service's AllowlistLimit throws its configured error string when the
 * value isn't allowlisted, which is what checkThemeLimitError returns here.
 */

interface CustomThemesLimit {
    allowlist?: string[];
    error?: string;
}

export interface ThemeLimits {
    /** False until the config response has loaded — don't act on the other fields before then. */
    isReady: boolean;
    isThemeLimited: boolean;
    /** A single-theme allowlist: every change (and any custom theme) errors. */
    noThemeChangesAllowed: boolean;
    /**
     * The limit error for changing to `themeName` (or for any custom theme
     * when omitted/`"."`), or null when allowed. Mirrors the legacy
     * checkThemeLimitError contract.
     */
    checkThemeLimitError: (themeName?: string) => string | null;
}

export function useThemeLimits(): ThemeLimits {
    const { data: configData } = useBrowseConfig();
    const limit: CustomThemesLimit | undefined = configData?.config.hostSettings?.limits?.customThemes;
    const allowlist = limit?.allowlist;
    const noThemeChangesAllowed = allowlist?.length === 1;

    const checkThemeLimitError = (themeName?: string): string | null => {
        if (!allowlist?.length) {
            return null;
        }
        const shouldError = noThemeChangesAllowed || (themeName && !allowlist.includes(themeName.toLowerCase()));
        if (!shouldError) {
            return null;
        }
        return limit?.error || "Your current plan doesn't support changing themes.";
    };

    return {
        isReady: Boolean(configData),
        isThemeLimited: Boolean(allowlist?.length),
        noThemeChangesAllowed: Boolean(noThemeChangesAllowed),
        checkThemeLimitError,
    };
}
