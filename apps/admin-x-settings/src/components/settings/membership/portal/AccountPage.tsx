import React, {FocusEventHandler, useEffect, useState} from 'react';
import {Form, TextField} from '@tryghost/admin-x-design-system';
import {SettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {fullEmailAddress, getEmailDomain} from '@tryghost/admin-x-framework/api/site';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const AccountPage: React.FC<{
    updateSetting: (key: string, setting: SettingValue) => void
}> = ({updateSetting}) => {
    const {siteData, settings, config} = useGlobalData();
    const [membersSupportAddress, supportEmailAddress] = getSettingValues(settings, ['members_support_address', 'support_email_address']);
    const calculatedSupportAddress = supportEmailAddress?.toString() || fullEmailAddress(membersSupportAddress?.toString() || '', siteData!, config);
    const emailDomain = getEmailDomain(siteData!, config);
    const [value, setValue] = useState(calculatedSupportAddress);

    const updateSupportAddress: FocusEventHandler<HTMLInputElement> = (e) => {
        let supportAddress = e.target.value;
        let settingValue = emailDomain && supportAddress === `noreply@${emailDomain}` ? 'noreply' : supportAddress;

        updateSetting('members_support_address', settingValue);
        setValue(fullEmailAddress(settingValue, siteData!, config));
    };

    useEffect(() => {
        setValue(calculatedSupportAddress);
    }, [calculatedSupportAddress]);

    return <div className='mt-7'><Form>
        <TextField title='Support email address' value={value} onBlur={updateSupportAddress} onChange={e => setValue(e.target.value)} />
    </Form></div>;
};

export default AccountPage;
