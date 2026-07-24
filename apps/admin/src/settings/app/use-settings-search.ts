import { createContext, useContext } from "react";

/**
 * Keyword search state for the settings shell — the subset of the legacy
 * search service (apps/admin-x-settings/src/utils/search.tsx) the chrome
 * needs: a filter string, keyword matching, the "nothing matched" signal,
 * and per-component registration (which powers "only search hit" behavior
 * like the Labs auto-expand).
 *
 * The legacy service also defined a `highlightKeywords` renderer, but no
 * legacy component consumes it — dead code, deliberately not ported.
 *
 * Kept separate from the provider component (search-provider.tsx) so route
 * files only export components (react-refresh/only-export-components).
 */

export type ComponentId = string & { __brand: "ComponentId" };

export const createComponentId = (base: string, unique: string): ComponentId => {
    return `${base}-${unique}` as ComponentId;
};

export interface SettingsSearch {
    filter: string;
    setFilter: (value: string) => void;
    /** True when the filter is empty or any keyword contains it (case-insensitive) — same matching as legacy. */
    checkVisible: (keywords: string[]) => boolean;
    /** True when no nav item matches the filter; sections stay visible in this state, mirroring legacy. */
    noResult: boolean;
    setNoResult: (value: boolean) => void;
    /** Registers a top-level group's keywords for visible-component tracking. */
    registerComponent: (id: ComponentId, keywords: string[]) => void;
    unregisterComponent: (id: ComponentId) => void;
    /** The registered components matching the current filter. */
    getVisibleComponents: () => Set<ComponentId>;
}

export const SettingsSearchContext = createContext<SettingsSearch>({
    filter: "",
    setFilter: () => {},
    checkVisible: () => true,
    noResult: false,
    setNoResult: () => {},
    registerComponent: () => {},
    unregisterComponent: () => {},
    getVisibleComponents: () => new Set<ComponentId>(),
});

export function useSettingsSearch(): SettingsSearch {
    return useContext(SettingsSearchContext);
}
