import React, {useEffect, useRef, useState} from 'react';
import {ErrorMessages, OkProps, SaveHandler, SaveState, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {Setting, SettingValue, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {SiteData} from '@tryghost/admin-x-framework/api/site';
import {useGlobalData} from '../components/providers/GlobalDataProvider';
import {useGlobalDirtyState} from '@tryghost/admin-x-design-system';

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

const useSettingGroup = ({savingDelay, onValidate}: {savingDelay?: number; onValidate?: () => ErrorMessages} = {}): SettingGroupHook => {
    // create a ref to focus the input field
    const focusRef = useRef<HTMLInputElement>(null);

    const {siteData, settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    const [isEditing, setEditing] = useState(false);

    const {formState: localSettings, saveState, handleSave, updateForm, setFormState, reset, validate, errors, clearError, okProps} = useForm<LocalSetting[]>({
        initialState: settings || [],
        savingDelay,
        onSave: async () => {
            await editSettings?.(changedSettings());
        },
        onSaveError: handleError,
        onValidate
    });

    const {setGlobalDirtyState} = useGlobalDirtyState();

    useEffect(() => {
        setGlobalDirtyState(localSettings.some(setting => setting.dirty));
    }, [localSettings, setGlobalDirtyState]);

    useEffect(() => {
        if (isEditing && focusRef.current) {
            focusRef.current.focus();
        }
    }, [isEditing]);

    // reset the local state when there's a new settings API response, unless currently editing
    useEffect(() => {
        if (!isEditing || saveState === 'saving') {
            setFormState(() => settings);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings]);

    const changedSettings = () => {
        return localSettings?.filter(setting => setting.dirty)
            ?.map((setting) => {
                return {
                    key: setting.key,
                    value: setting.value
                };
            });
    };

    // function to cancel the changes
    const handleCancel = () => {
        reset();
        setEditing(false);
    };

    // function to update the state of group
    const handleEditingChange = (newIsEditing: boolean) => {
        setEditing(newIsEditing);
    };

    // function to update the local state
    const updateSetting = (key: string, value: SettingValue) => {
        updateForm((state) => {
            if (state.some(setting => setting.key === key)) {
                return state.map(setting => (
                    setting.key === key ? {...setting, value, dirty: true} : setting
                ));
            } else {
                return [...state, {key, value, dirty: true}];
            }
        });
    };

    return {
        localSettings,
        isEditing,
        saveState,
        focusRef,
        siteData,
        handleSave: async () => {
            const result = await handleSave();
            if (result) {
                setEditing(false);
            } else {
            }
            return result;
        },
        handleCancel,
        updateSetting,
        handleEditingChange,
        validate,
        errors,
        clearError,
        okProps
    };
};

export default useSettingGroup;
