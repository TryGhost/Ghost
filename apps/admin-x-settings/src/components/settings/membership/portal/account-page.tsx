import React, {type FocusEventHandler, useEffect, useState} from 'react';
import TransistorSettings from './transistor-settings';
import validator from 'validator';
import {Field, FieldError, FieldGroup, FieldLabel, Input} from '@tryghost/shade/components';
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
        const supportAddress = e.target.value;

        if (!supportAddress) {
            setError('members_support_address', 'Enter an email address');
        } else if (!validator.isEmail(supportAddress)) {
            setError('members_support_address', 'Enter a valid email address');
        } else {
            setError('members_support_address', '');
        }

        const settingValue = emailDomain && supportAddress === `noreply@${emailDomain}` ? 'noreply' : supportAddress;

        updateSetting('members_support_address', settingValue);
        setValue(fullEmailAddress(settingValue, siteData!, config));
    };

    useEffect(() => {
        setValue(calculatedSupportAddress);
    }, [calculatedSupportAddress]);

    return <div className='mt-7'><FieldGroup className='mb-10 gap-8 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
        <Field data-invalid={Boolean(errors.members_support_address) || undefined}>
            <FieldLabel htmlFor='members-support-address'>Support email address</FieldLabel>
            <Input aria-invalid={Boolean(errors.members_support_address) || undefined} id='members-support-address' value={value} onBlur={updateSupportAddress} onChange={e => setValue(e.target.value)} />
            {errors.members_support_address && <FieldError>{errors.members_support_address}</FieldError>}
        </Field>

        <TransistorSettings
            localSettings={localSettings}
            updateSetting={updateSetting}
        />
    </FieldGroup></div>;
};

export default AccountPage;
