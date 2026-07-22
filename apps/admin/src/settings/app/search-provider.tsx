import { type ReactNode, useMemo, useState } from "react";

import { type SettingsSearch, SettingsSearchContext } from "./use-settings-search";

export function SettingsSearchProvider({ children }: { children: ReactNode }) {
    const [filter, setFilter] = useState("");
    const [noResult, setNoResult] = useState(false);

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
    }), [filter, noResult]);

    return (
        <SettingsSearchContext.Provider value={value}>
            {children}
        </SettingsSearchContext.Provider>
    );
}
