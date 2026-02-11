import React from 'react';
import {Heading, Separator, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {type Setting, type SettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';

interface TransistorPortalSettings {
    enabled: boolean;
    heading: string;
    description: string;
    button_text: string;
    url_template: string;
}

const defaultTransistorSettings: TransistorPortalSettings = {
    enabled: true,
    heading: 'Podcasts',
    description: 'Access your RSS feeds',
    button_text: 'Manage',
    url_template: 'https://partner.transistor.fm/ghost/{memberUuid}'
};

const TransistorSettings: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
}> = ({localSettings, updateSetting}) => {
    const [transistorPortalSettingsJson] = getSettingValues<string>(localSettings, ['transistor_portal_settings']);
    const transistorSettings: TransistorPortalSettings = transistorPortalSettingsJson
        ? JSON.parse(transistorPortalSettingsJson) as TransistorPortalSettings
        : defaultTransistorSettings;

    const updateTransistorSetting = <K extends keyof TransistorPortalSettings>(key: K, settingValue: TransistorPortalSettings[K]) => {
        const newSettings = {...transistorSettings, [key]: settingValue};
        updateSetting('transistor_portal_settings', JSON.stringify(newSettings));
    };

    return (
        <>
            <Separator />
            <Heading level={5}>Transistor</Heading>
            <Toggle
                checked={transistorSettings.enabled}
                direction='rtl'
                hint='Show a section on the account page for members to access private podcasts'
                label='Enable Transistor integration'
                onChange={e => updateTransistorSetting('enabled', e.target.checked)}
            />
            {transistorSettings.enabled && (
                <>
                    <TextField
                        hint='The heading displayed above the Transistor section'
                        title='Heading'
                        value={transistorSettings.heading}
                        onChange={e => updateTransistorSetting('heading', e.target.value)}
                    />
                    <TextField
                        hint='A short description of what members can do'
                        title='Description'
                        value={transistorSettings.description}
                        onChange={e => updateTransistorSetting('description', e.target.value)}
                    />
                    <TextField
                        hint='The text displayed on the button'
                        title='Button text'
                        value={transistorSettings.button_text}
                        onChange={e => updateTransistorSetting('button_text', e.target.value)}
                    />
                    <TextField
                        hint='Use {memberUuid} as a placeholder for the member ID'
                        title='URL template'
                        value={transistorSettings.url_template}
                        onChange={e => updateTransistorSetting('url_template', e.target.value)}
                    />
                </>
            )}
        </>
    );
};

export default TransistorSettings;
