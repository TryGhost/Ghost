import React, {createContext, useCallback, useEffect, useState} from 'react';
import {Setting} from '../../types/api';
import {settingsApi} from '../../utils/api';

// Define the Settings Context
interface SettingsContextProps {
  settings: Setting[] | null;
  saveSettings: (updatedSettings: Setting[]) => Promise<void>;
}

interface SettingsProviderProps {
    children?: React.ReactNode;
}

const SettingsContext = createContext<SettingsContextProps>({
    settings: null,
    saveSettings: async () => {}
});

// Create a Settings Provider component
const SettingsProvider: React.FC<SettingsProviderProps> = ({children}) => {
    const [settings, setSettings] = useState <Setting[] | null> (null);

    useEffect(() => {
        const fetchSettings = async (): Promise<void> => {
            try {
                // Make an API call to fetch the settings
                const data = await settingsApi.browse();
                setSettings(data.settings);
            } catch (error) {
                // Log error in settings API
            }
        };

        // Fetch the initial settings from the API
        fetchSettings();
    }, []);

    const saveSettings = useCallback(async (updatedSettings: Setting[]): Promise<void> => {
        try {
            // Make an API call to save the updated settings
            const data = await settingsApi.edit(updatedSettings);

            setSettings(data.settings);
        } catch (error) {
            // Log error in settings API
        }
    }, []);

    // Provide the settings and the saveSettings function to the children components
    return (
        <SettingsContext.Provider value={{settings, saveSettings}}>
            {children}
        </SettingsContext.Provider>
    );
};

export {SettingsContext, SettingsProvider};
