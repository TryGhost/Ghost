import {Setting} from '../types/api';
import {useCallback, useMemo} from 'react';
import {useEditSettings} from '../utils/api/settings';
import {useGlobalData} from '../components/providers/DataProvider';

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

// TODO: Make this not a provider
const useSettings = () => {
    const {settings, siteData, config} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();

    const saveSettings = useCallback(async (updatedSettings: Setting[]) => {
        try {
            // handle transformation for settings before save
            updatedSettings = deserializeSettings(updatedSettings);
            // Make an API call to save the updated settings
            const data = await editSettings(updatedSettings);
            const newSettings = serialiseSettingsData(data.settings);

            return {
                settings: newSettings,
                meta: data.meta
            };
        } catch (error) {
            // Log error in settings API
            return {settings: []};
        }
    }, [editSettings]);

    const serializedSettings = useMemo(() => serialiseSettingsData(settings), [settings]);

    return {
        settings: serializedSettings,
        saveSettings,
        siteData,
        config
    };
};

export default useSettings;
