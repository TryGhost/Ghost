import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {ServicesContext} from './ServiceProvider';
import {Setting, SiteData} from '../../types/api';

// Define the Settings Context
interface SettingsContextProps {
    settings: Setting[] | null;
    saveSettings: (updatedSettings: Setting[]) => Promise<void>;
    siteData: SiteData | null;
}

interface SettingsProviderProps {
    children?: React.ReactNode;
}

const SettingsContext = createContext<SettingsContextProps>({
    settings: null,
    siteData: null,
    saveSettings: async () => {}
});

function serialiseSettingsData(settings: Setting[]): Setting[] {
    return settings.map((setting) => {
        if (setting.key === 'facebook' && setting.value) {
            const value = setting.value as string;
            let [, user] = value.match(/(\S+)/) || [];

            return {
                key: setting.key,
                value: `https://www.facebook.com/${user}`
            };
        }
        if (setting.key === 'twitter' && setting.value) {
            const value = setting.value as string;
            let [, user] = value.match(/@?([^/]*)/) || [];

            return {
                key: setting.key,
                value: `https://twitter.com/${user}`
            };
        }

        return {
            key: setting.key,
            value: setting.value
        };
    });
}

function deserializeSettings(settings: Setting[]): Setting[] {
    return settings.map((setting) => {
        if (setting.key === 'facebook' && setting.value) {
            const deserialized = setting.value as string;
            let [, user] = deserialized.match(/(?:https:\/\/)(?:www\.)(?:facebook\.com)\/(?:#!\/)?(\w+\/?\S+)/mi) || [];

            return {
                key: setting.key,
                value: user
            };
        }

        if (setting.key === 'twitter' && setting.value) {
            const deserialized = setting.value as string;
            let [, user] = deserialized.match(/(?:https:\/\/)(?:twitter\.com)\/(?:#!\/)?@?([^/]*)/) || [];

            return {
                key: setting.key,
                value: `@${user}`
            };
        }

        return {
            key: setting.key,
            value: setting.value
        };
    });
}

// Create a Settings Provider component
const SettingsProvider: React.FC<SettingsProviderProps> = ({children}) => {
    const {api} = useContext(ServicesContext);
    const [settings, setSettings] = useState <Setting[] | null> (null);
    const [siteData, setSiteData] = useState <SiteData | null> (null);

    useEffect(() => {
        const fetchSettings = async (): Promise<void> => {
            try {
                // Make an API call to fetch the settings
                const data = await api.settings.browse();
                const siteDataRes = await api.site.browse();

                setSettings(serialiseSettingsData(data.settings));
                setSiteData(siteDataRes.site);
            } catch (error) {
                // Log error in settings API
            }
        };

        // Fetch the initial settings from the API
        fetchSettings();
    }, [api]);

    const saveSettings = useCallback(async (updatedSettings: Setting[]): Promise<void> => {
        try {
            // handle transformation for settings before save
            updatedSettings = deserializeSettings(updatedSettings);
            // Make an API call to save the updated settings
            const data = await api.settings.edit(updatedSettings);

            setSettings(serialiseSettingsData(data.settings));
        } catch (error) {
            // Log error in settings API
        }
    }, [api]);

    // Provide the settings and the saveSettings function to the children components
    return (
        <SettingsContext.Provider value={{
            settings, saveSettings, siteData
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export {SettingsContext, SettingsProvider};

