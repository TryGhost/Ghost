import React, {useEffect, useRef, useState} from 'react';
import useForm, {SaveState} from './useForm';
import useGlobalDirtyState from './useGlobalDirtyState';
import {Setting, SettingValue, useEditSettings} from '../api/settings';
import {SiteData} from '../api/site';
import {useGlobalData} from '../components/providers/GlobalDataProvider';

interface LocalSetting extends Setting {
    dirty?: boolean;
}

export interface SettingGroupHook {
    localSettings: LocalSetting[];
    isEditing: boolean;
    saveState: SaveState;
    siteData: SiteData | null;
    focusRef: React.RefObject<HTMLInputElement>;
    handleSave: () => Promise<boolean>;
    handleCancel: () => void;
    updateSetting: (key: string, value: SettingValue) => void;
    handleEditingChange: (newState: boolean) => void;
}

const useSettingGroup = (): SettingGroupHook => {
    // create a ref to focus the input field
    const focusRef = useRef<HTMLInputElement>(null);

    const {siteData, settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();

    const [isEditing, setEditing] = useState(false);

    const {formState: localSettings, saveState, handleSave, updateForm, reset} = useForm<LocalSetting[]>({
        initialState: settings || [],
        onSave: async () => {
            await editSettings?.(changedSettings());
        }
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
            reset();
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
        updateForm(state => state.map(setting => (
            setting.key === key ? {...setting, value, dirty: true} : setting
        )));
    };

    return {
        localSettings,
        isEditing,
        saveState,
        focusRef,
        siteData,
        handleSave: () => {
            const result = handleSave();
            setEditing(false);
            return result;
        },
        handleCancel,
        updateSetting,
        handleEditingChange
    };
};

export default useSettingGroup;
