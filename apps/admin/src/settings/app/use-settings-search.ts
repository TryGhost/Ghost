import { createContext, useContext } from "react";

/**
 * Keyword search state for the settings shell — the subset of the legacy
 * search service (apps/admin-x-settings/src/utils/search.tsx) the chrome
 * needs: a filter string, keyword matching, and the "nothing matched"
 * signal. The legacy service's per-component registration and keyword
 * highlighting stay with the legacy app; area agents port what their
 * screens need when they rebuild them.
 *
 * Kept separate from the provider component (search-provider.tsx) so route
 * files only export components (react-refresh/only-export-components).
 */
export interface SettingsSearch {
    filter: string;
    setFilter: (value: string) => void;
    /** True when the filter is empty or any keyword contains it (case-insensitive) — same matching as legacy. */
    checkVisible: (keywords: string[]) => boolean;
    /** True when no nav item matches the filter; sections stay visible in this state, mirroring legacy. */
    noResult: boolean;
    setNoResult: (value: boolean) => void;
}

export const SettingsSearchContext = createContext<SettingsSearch>({
    filter: "",
    setFilter: () => {},
    checkVisible: () => true,
    noResult: false,
    setNoResult: () => {},
});

export function useSettingsSearch(): SettingsSearch {
    return useContext(SettingsSearchContext);
}
