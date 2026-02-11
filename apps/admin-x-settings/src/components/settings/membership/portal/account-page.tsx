import React, {type FocusEventHandler, useEffect, useState} from 'react';
import useFeatureFlag from '../../../../hooks/use-feature-flag';
import validator from 'validator';
import {Form, Heading, Separator, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {type Setting, type SettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {fullEmailAddress, getEmailDomain} from '@tryghost/admin-x-framework/api/site';
import {useGlobalData} from '../../../providers/global-data-provider';

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

const AccountPage: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
    errors: Record<string, string | undefined>
    setError: (key: string, error: string | undefined) => void
}> = ({localSettings, updateSetting, errors, setError}) => {
    const {siteData, settings, config} = useGlobalData();
    const hasTransistor = useFeatureFlag('transistor');
    const [membersSupportAddress, supportEmailAddress] = getSettingValues(settings, ['members_support_address', 'support_email_address']);
    const calculatedSupportAddress = supportEmailAddress?.toString() || fullEmailAddress(membersSupportAddress?.toString() || '', siteData!, config);
    const emailDomain = getEmailDomain(siteData!, config);
    const [value, setValue] = useState(calculatedSupportAddress);
    const [transistorPortalSettingsJson] = getSettingValues<string>(localSettings, ['transistor_portal_settings']);
    const transistorSettings: TransistorPortalSettings = transistorPortalSettingsJson
        ? JSON.parse(transistorPortalSettingsJson) as TransistorPortalSettings
        : defaultTransistorSettings;

    const updateTransistorSetting = <K extends keyof TransistorPortalSettings>(key: K, settingValue: TransistorPortalSettings[K]) => {
        const newSettings = {...transistorSettings, [key]: settingValue};
        updateSetting('transistor_portal_settings', JSON.stringify(newSettings));
    };

    const updateSupportAddress: FocusEventHandler<HTMLInputElement> = (e) => {
        let supportAddress = e.target.value;

        if (!supportAddress) {
            setError('members_support_address', 'Enter an email address');
        } else if (!validator.isEmail(supportAddress)) {
            setError('members_support_address', 'Enter a valid email address');
        } else {
            setError('members_support_address', '');
        }

        let settingValue = emailDomain && supportAddress === `noreply@${emailDomain}` ? 'noreply' : supportAddress;

        updateSetting('members_support_address', settingValue);
        setValue(fullEmailAddress(settingValue, siteData!, config));
    };

    useEffect(() => {
        setValue(calculatedSupportAddress);
    }, [calculatedSupportAddress]);

    return <div className='mt-7'><Form>
        <TextField
            error={!!errors.members_support_address}
            hint={errors.members_support_address}
            title='Support email address'
            value={value}
            onBlur={updateSupportAddress}
            onChange={e => setValue(e.target.value)}
        />

        {hasTransistor && (
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
        )}
    </Form></div>;
};

export default AccountPage;
