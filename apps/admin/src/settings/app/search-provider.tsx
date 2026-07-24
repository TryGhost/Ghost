import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type ComponentId, type SettingsSearch, SettingsSearchContext } from "./use-settings-search";

const matchesFilter = (keywords: string[], filter: string) =>
    !filter || keywords.some((keyword) => keyword.toLowerCase().includes(filter.toLowerCase()));

export function SettingsSearchProvider({ children }: { children: ReactNode }) {
    const [filter, setFilter] = useState("");
    const [noResult, setNoResult] = useState(false);
    const registeredComponents = useRef<Map<ComponentId, string[]>>(new Map());
    const [visibleComponents, setVisibleComponents] = useState<Set<ComponentId>>(new Set());
    const filterRef = useRef(filter);
    filterRef.current = filter;

    const registerComponent = useCallback((id: ComponentId, keywords: string[]) => {
        registeredComponents.current.set(id, keywords);
        const isVisible = matchesFilter(keywords, filterRef.current);
        setVisibleComponents((prev) => {
            if (prev.has(id) === isVisible) {
                return prev;
            }
            const next = new Set(prev);
            if (isVisible) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }, []);

    const unregisterComponent = useCallback((id: ComponentId) => {
        registeredComponents.current.delete(id);
        setVisibleComponents((prev) => {
            if (!prev.has(id)) {
                return prev;
            }
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    // Recompute the visible set when the filter changes (legacy contract).
    useEffect(() => {
        const newVisible = new Set<ComponentId>();
        registeredComponents.current.forEach((keywords, id) => {
            if (matchesFilter(keywords, filter)) {
                newVisible.add(id);
            }
        });
        setVisibleComponents(newVisible);
    }, [filter]);

    const getVisibleComponents = useCallback(() => visibleComponents, [visibleComponents]);

    const value = useMemo<SettingsSearch>(() => ({
        filter,
        setFilter,
        checkVisible: (keywords: string[]) => {
            if (!keywords.length || !filter) {
                return true;
            }
            return keywords.some((keyword) => keyword.toLowerCase().includes(filter.toLowerCase()));
        },
        noResult,
        setNoResult,
        registerComponent,
        unregisterComponent,
        getVisibleComponents,
    }), [filter, noResult, registerComponent, unregisterComponent, getVisibleComponents]);

    return (
        <SettingsSearchContext.Provider value={value}>
            {children}
        </SettingsSearchContext.Provider>
    );
}
