import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {Config, Setting, SiteData} from '../../types/api';
import {ServicesContext} from './ServiceProvider';
import {SettingsResponseType} from '../../utils/api';

// Define the Settings Context
interface SettingsContextProps {
    settings: Setting[] | null;
    saveSettings: (updatedSettings: Setting[]) => Promise<SettingsResponseType>;
    siteData: SiteData | null;
    config: Config | null;
    settingsLoaded: boolean;
}

interface SettingsProviderProps {
    children?: React.ReactNode;
}

const SettingsContext = createContext<SettingsContextProps>({
    settings: null,
    siteData: null,
    config: null,
    settingsLoaded: false,
    saveSettings: async () => ({settings: []})
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
    const [settings, setSettings] = useState<Setting[] | null> (null);
    const [siteData, setSiteData] = useState<SiteData | null> (null);
    const [config, setConfig] = useState<Config | null> (null);
    const [settingsLoaded, setSettingsLoaded] = useState<boolean> (false);

    useEffect(() => {
        const fetchSettings = async (): Promise<void> => {
            try {
                // Make an API call to fetch the settings
                const [settingsData, siteDataResponse, configData] = await Promise.all([
                    api.settings.browse(),
                    api.site.browse(),
                    api.config.browse()
                ]);

                setSettings(serialiseSettingsData(settingsData.settings));
                setSiteData(siteDataResponse.site);
                setConfig(configData.config);
                setSettingsLoaded(true);
            } catch (error) {
                // Log error in settings API
            }
        };

        // Fetch the initial settings from the API
        fetchSettings();
    }, [api]);

    const saveSettings = useCallback(async (updatedSettings: Setting[]) => {
        try {
            // handle transformation for settings before save
            updatedSettings = deserializeSettings(updatedSettings);
            // Make an API call to save the updated settings
            const data = await api.settings.edit(updatedSettings);
            const newSettings = serialiseSettingsData(data.settings);

            setSettings(newSettings);

            return {
                settings: newSettings,
                meta: data.meta
            };
        } catch (error) {
            // Log error in settings API
            return {settings: []};
        }
    }, [api]);

    // Provide the settings and the saveSettings function to the children components
    return (
        <SettingsContext.Provider value={{
            settings, saveSettings, siteData, config, settingsLoaded
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export {SettingsContext, SettingsProvider};

