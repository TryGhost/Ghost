import React, {type FocusEventHandler, useEffect, useState} from 'react';
import TransistorSettings from './transistor-settings';
import validator from 'validator';
import {Field, FieldLabel, Switch} from '@tryghost/shade/components';
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
    // Per-surface companion to portal_gift on the signup options tab: whether
    // paid members see the gift card on their account page. There is no
    // global gift switch — each surface is controlled where it lives.
    const [portalAccountGift] = getSettingValues(localSettings, ['portal_account_gift']);
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

    return <div className='mt-7'><Form>
        {/* Before the support address, matching the account page itself:
            the gift card sits above the footer where support lives. */}
        <Field orientation='horizontal'>
            <FieldLabel htmlFor='portal-account-gift'>Display option to purchase gift</FieldLabel>
            <Switch checked={Boolean(portalAccountGift)} id='portal-account-gift' onCheckedChange={checked => updateSetting('portal_account_gift', checked)} />
        </Field>

        <TextField
            error={!!errors.members_support_address}
            hint={errors.members_support_address}
            title='Support email address'
            value={value}
            onBlur={updateSupportAddress}
            onChange={e => setValue(e.target.value)}
        />

        <TransistorSettings
            localSettings={localSettings}
            updateSetting={updateSetting}
        />
    </Form></div>;
};

export default AccountPage;
