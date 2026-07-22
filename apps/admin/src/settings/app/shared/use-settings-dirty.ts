import { createContext, useContext } from "react";

/**
 * Context surface for page-level dirty tracking (see dirty.tsx for the
 * provider) — the equivalent of the legacy useGlobalDirtyState contract:
 * any group with unsaved changes marks the page dirty, and the shell's exit
 * paths confirm before leaving. Kept separate so the provider file only
 * exports components (react-refresh/only-export-components).
 */

export interface SettingsDirtyContextValue {
    isDirty: boolean;
    /** Report a source's dirty state under a stable id (e.g. useId()). */
    setDirty: (id: string, dirty: boolean) => void;
}

export const SettingsDirtyContext = createContext<SettingsDirtyContextValue | null>(null);

export function useSettingsDirty(): SettingsDirtyContextValue {
    const context = useContext(SettingsDirtyContext);
    if (!context) {
        throw new Error("useSettingsDirty must be used within SettingsDirtyProvider");
    }
    return context;
}
