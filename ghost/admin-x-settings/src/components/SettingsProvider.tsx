import React, {createContext, useEffect, useState} from 'react';
import {getSettings, updateSettings} from '../utils/api';

// Define the Setting type
export interface ISetting {
    key: string;
    value: string;
}

// Define the Settings Context
interface SettingsContextProps {
  settings: ISetting[] | null;
  saveSettings: (updatedSettings: ISetting[]) => void;
}

interface SettingsProviderProps {
    children?: React.ReactNode;
}

const SettingsContext = createContext < SettingsContextProps | undefined > (undefined);

// Create a Settings Provider component
const SettingsProvider: React.FC<SettingsProviderProps> = ({children}) => {
    const [settings, setSettings] = useState <ISetting[] | null> (null);

    useEffect(() => {
        const fetchSettings = async (): Promise<void> => {
            try {
                // Make an API call to fetch the settings
                const data = await getSettings();
                setSettings(data.settings);
            } catch (error) {
                // Log error in settings API
            }
        };

        // Fetch the initial settings from the API
        fetchSettings();
    }, []);

    const saveSettings = async (updatedSettings: ISetting[]): Promise<void> => {
        try {
            // Make an API call to save the updated settings
            const data = await updateSettings(updatedSettings);

            // Update the local state with the new settings
            setSettings(data.settings);
        } catch (error) {
            // Log error in settings API
        }
    };

    // Provide the settings and the saveSettings function to the children components
    return (
        <SettingsContext.Provider value={{settings, saveSettings}}>
            {children}
        </SettingsContext.Provider>
    );
};

export {SettingsContext, SettingsProvider};
