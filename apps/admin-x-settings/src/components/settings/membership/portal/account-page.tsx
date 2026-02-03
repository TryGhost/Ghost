import React, {type FocusEventHandler, useEffect, useState} from 'react';
import useFeatureFlag from '../../../../hooks/use-feature-flag';
import validator from 'validator';
import {Form, TextField} from '@tryghost/admin-x-design-system';
import {type Setting, type SettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {fullEmailAddress, getEmailDomain} from '@tryghost/admin-x-framework/api/site';
import {useGlobalData} from '../../../providers/global-data-provider';

const AccountPage: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
    errors: Record<string, string | undefined>
    setError: (key: string, error: string | undefined) => void
}> = ({localSettings, updateSetting, errors, setError}) => {
    const {siteData, settings, config} = useGlobalData();
    const [membersSupportAddress, supportEmailAddress] = getSettingValues(settings, ['members_support_address', 'support_email_address']);
    const calculatedSupportAddress = supportEmailAddress?.toString() || fullEmailAddress(membersSupportAddress?.toString() || '', siteData!, config);
    const emailDomain = getEmailDomain(siteData!, config);
    const [value, setValue] = useState(calculatedSupportAddress);

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

    const transistorEnabled = useFeatureFlag('transistor');
    const [transistorHeading, transistorDescription, transistorButtonText] = getSettingValues<string>(localSettings, [
        'portal_transistor_heading',
        'portal_transistor_description',
        'portal_transistor_button_text'
    ]);

    return <div className='mt-7'>
        <Form>
            <TextField
                error={!!errors.members_support_address}
                hint={errors.members_support_address}
                title='Support email address'
                value={value}
                onBlur={updateSupportAddress}
                onChange={e => setValue(e.target.value)}
            />
        </Form>
        {transistorEnabled && (
            <Form gap='sm' title='Podcasts'>
                <TextField
                    title='Heading'
                    value={transistorHeading || ''}
                    onChange={e => updateSetting('portal_transistor_heading', e.target.value)}
                />
                <TextField
                    title='Description'
                    value={transistorDescription || ''}
                    onChange={e => updateSetting('portal_transistor_description', e.target.value)}
                />
                <TextField
                    title='Button text'
                    value={transistorButtonText || ''}
                    onChange={e => updateSetting('portal_transistor_button_text', e.target.value)}
                />
            </Form>
        )}
    </div>;
};

export default AccountPage;
