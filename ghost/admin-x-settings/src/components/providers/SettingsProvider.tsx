import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {ServicesContext} from './ServiceProvider';
import {Setting} from '../../types/api';

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
    const {api} = useContext(ServicesContext);
    const [settings, setSettings] = useState <Setting[] | null> (null);

    useEffect(() => {
        const fetchSettings = async (): Promise<void> => {
            try {
                // Make an API call to fetch the settings
                const data = await api.settings.browse();
                setSettings(data.settings);
            } catch (error) {
                // Log error in settings API
            }
        };

        // Fetch the initial settings from the API
        fetchSettings();
    }, [api]);

    const saveSettings = useCallback(async (updatedSettings: Setting[]): Promise<void> => {
        try {
            // Make an API call to save the updated settings
            const data = await api.settings.edit(updatedSettings);

            setSettings(data.settings);
        } catch (error) {
            // Log error in settings API
        }
    }, [api]);

    // Provide the settings and the saveSettings function to the children components
    return (
        <SettingsContext.Provider value={{settings, saveSettings}}>
            {children}
        </SettingsContext.Provider>
    );
};

export {SettingsContext, SettingsProvider};
