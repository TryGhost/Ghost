import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";

import { SettingsDirtyContext, type SettingsDirtyContextValue } from "./use-settings-dirty";

/** Provider for the settings page-level dirty registry (see use-settings-dirty.ts). */
export function SettingsDirtyProvider({ children }: { children: ReactNode }) {
    const dirtyIds = useRef(new Set<string>());
    const [isDirty, setIsDirty] = useState(false);

    const setDirty = useCallback((id: string, dirty: boolean) => {
        if (dirty) {
            dirtyIds.current.add(id);
        } else {
            dirtyIds.current.delete(id);
        }
        setIsDirty(dirtyIds.current.size > 0);
    }, []);

    const value = useMemo<SettingsDirtyContextValue>(() => ({ isDirty, setDirty }), [isDirty, setDirty]);

    return <SettingsDirtyContext.Provider value={value}>{children}</SettingsDirtyContext.Provider>;
}
