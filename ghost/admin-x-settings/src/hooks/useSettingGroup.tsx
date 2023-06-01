import React, {useEffect} from 'react';
import {SaveState, TSettingGroupStates} from '../admin-x-ds/settings/SettingGroup';
import {Setting, SettingValue, SiteData} from '../types/api';
import {SettingsContext} from '../components/providers/SettingsProvider';
import {useContext, useReducer, useRef, useState} from 'react';

interface LocalSetting extends Setting {
    dirty?: boolean;
}

export interface SettingGroupHook {
    currentState: TSettingGroupStates;
    saveState: SaveState;
    siteData: SiteData | null;
    focusRef: React.RefObject<HTMLInputElement>;
    handleSave: () => void;
    handleCancel: () => void;
    updateSetting: (key: string, value: SettingValue) => void;
    getSettingValues: (keys: string[]) => (SettingValue|undefined)[];
    handleStateChange: (newState: TSettingGroupStates) => void;
}

type UpdateAction = {
    type: 'update';
    payload: Setting;
};

type ResetAllAction = {
    type: 'resetAll';
    payload: LocalSetting[];
};

type ActionType = UpdateAction | ResetAllAction;

type SettingsReducer = React.Reducer<LocalSetting[], ActionType>;

// create a reducer to update the local state
function settingsReducer(state: Setting[], action: ActionType) {
    switch (action.type) {
    case 'update':
        return state.map((setting) => {
            if (setting.key === action.payload?.key) {
                return {
                    ...action.payload,
                    dirty: true
                };
            }
            return setting;
        });
    case 'resetAll':
        // reset local settings to the original settings
        return action.payload;
    default:
        return state;
    }
}

const useSettingGroup = (): SettingGroupHook => {
    // create a ref to focus the input field
    const focusRef = useRef<HTMLInputElement>(null);

    // get the settings and saveSettings function from the Settings Context
    const {siteData, settings, saveSettings} = useContext(SettingsContext) || {};

    // create a local state to store the settings
    const [localSettings, dispatch] = useReducer<SettingsReducer>(settingsReducer, settings || []);

    // create a state to track the current state of the setting group
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const [saveState, setSaveState] = useState<SaveState>('');

    // focus the input field when the state changes to edit
    useEffect(() => {
        if (currentState === 'edit' && focusRef.current) {
            focusRef.current.focus();
        }
    }, [currentState]);

    // Reset saved state after 2 seconds
    useEffect(() => {
        if (saveState === 'saved') {
            setTimeout(() => {
                setSaveState('');
            }, 2000);
        }
    }, [saveState]);

    // function to save the changed settings via API
    const handleSave = async () => {
        const changedSettings = localSettings?.filter(setting => setting.dirty)
            ?.map((setting) => {
                return {
                    key: setting.key,
                    value: setting.value
                };
            });
        if (!changedSettings?.length) {
            return;
        }
        setSaveState('saving');
        await saveSettings?.(changedSettings);
        setSaveState('saved');
        setCurrentState('view');
    };

    // function to cancel the changes
    const handleCancel = () => {
        dispatch({
            type: 'resetAll',
            payload: settings || []
        });
        setCurrentState('view');
    };

    // function to update the state of group
    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    // function to update the local state
    const updateSetting = (key: string, value: SettingValue) => {
        setCurrentState('unsaved');
        dispatch({
            type: 'update',
            payload: {
                key,
                value
            }
        });
    };

    // function to get the values of the settings
    const getSettingValues = (keys: string[]) => {
        return keys.map((key) => {
            return localSettings?.find(setting => setting.key === key)?.value;
        });
    };

    return {
        currentState,
        saveState,
        focusRef,
        siteData,
        handleSave,
        handleCancel,
        updateSetting,
        getSettingValues,
        handleStateChange
    };
};

export default useSettingGroup;
