import { useCallback, useEffect, useId, useRef, useState } from "react";
import { type ErrorMessages, type OkProps, type SaveHandler, type SaveState, useForm } from "@tryghost/admin-x-framework/hooks";
import { type Setting, type SettingValue, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";
import { type SiteData, useBrowseSite } from "@tryghost/admin-x-framework/api/site";

import { useSettingsDirty } from "./use-settings-dirty";
import { useSettingsHandleError } from "./toast";

/**
 * The view→Edit→save/cancel interaction for one settings group, ported from
 * apps/admin-x-settings/src/hooks/use-setting-group.tsx onto the framework's
 * settings hooks (no GlobalDataProvider): same local dirty-flagged settings
 * state, the same reset-on-fresh-API-response rule, and page-level dirty
 * reporting wired into the shell's exit confirmation.
 */

interface LocalSetting extends Setting {
    dirty?: boolean;
}

export interface SettingGroupHook {
    localSettings: LocalSetting[];
    isEditing: boolean;
    saveState: SaveState;
    siteData: SiteData | null;
    focusRef: React.RefObject<HTMLInputElement>;
    handleSave: SaveHandler;
    handleCancel: () => void;
    updateSetting: (key: string, value: SettingValue) => void;
    handleEditingChange: (newState: boolean) => void;
    validate: () => boolean;
    errors: ErrorMessages;
    clearError: (key: string) => void;
    okProps: OkProps;
}

export function useSettingGroup({ savingDelay, onValidate }: { savingDelay?: number; onValidate?: () => ErrorMessages } = {}): SettingGroupHook {
    const focusRef = useRef<HTMLInputElement>(null);

    const { data: settingsData } = useBrowseSettings();
    const { data: siteResponse } = useBrowseSite();
    const settings = settingsData?.settings ?? [];
    const siteData = siteResponse?.site ?? null;
    const { mutateAsync: editSettings } = useEditSettings();
    const handleError = useSettingsHandleError();

    const [isEditing, setEditing] = useState(false);

    const { formState: localSettings, saveState, handleSave, updateForm, setFormState, reset, validate, errors, clearError, okProps } = useForm<LocalSetting[]>({
        initialState: settings,
        savingDelay,
        onSave: async () => {
            await editSettings?.(changedSettings());
        },
        onSaveError: handleError,
        onValidate,
    });

    const dirtyId = useId();
    const { setDirty } = useSettingsDirty();

    useEffect(() => {
        setDirty(dirtyId, localSettings.some((setting) => setting.dirty));
    }, [localSettings, dirtyId, setDirty]);

    useEffect(() => () => setDirty(dirtyId, false), [dirtyId, setDirty]);

    useEffect(() => {
        if (isEditing && focusRef.current) {
            focusRef.current.focus();
        }
    }, [isEditing]);

    // Reset the local state when a fresh settings API response lands, unless
    // the group is being edited right now.
    useEffect(() => {
        if (!isEditing || saveState === "saving") {
            setFormState(() => settings);
        }
         
    }, [settingsData]);

    const changedSettings = () =>
        localSettings
            ?.filter((setting) => setting.dirty)
            ?.map(({ key, value }) => ({ key, value }));

    const handleCancel = () => {
        reset();
        setEditing(false);
    };

    const handleEditingChange = (newIsEditing: boolean) => {
        setEditing(newIsEditing);
    };

    const updateSetting = useCallback((key: string, value: SettingValue) => {
        updateForm((state) => {
            if (state.some((setting) => setting.key === key)) {
                return state.map((setting) => (setting.key === key ? { ...setting, value, dirty: true } : setting));
            }
            return [...state, { key, value, dirty: true }];
        });
    }, [updateForm]);

    return {
        localSettings,
        isEditing,
        saveState,
        focusRef,
        siteData,
        handleSave: async (options) => {
            const result = await handleSave(options);
            if (result) {
                setEditing(false);
            }
            return result;
        },
        handleCancel,
        updateSetting,
        handleEditingChange,
        validate,
        errors,
        clearError,
        okProps,
    };
}
