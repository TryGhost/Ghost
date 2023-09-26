import Form from '../../../../admin-x-ds/global/form/Form';
import React, {FocusEventHandler, useEffect, useState} from 'react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import {SettingValue, getSettingValues} from '../../../../api/settings';
import {fullEmailAddress, getEmailDomain} from '../../../../api/site';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const AccountPage: React.FC<{
    updateSetting: (key: string, setting: SettingValue) => void
}> = ({updateSetting}) => {
    const {siteData, settings} = useGlobalData();
    const [membersSupportAddress] = getSettingValues(settings, ['members_support_address']);
    const emailDomain = getEmailDomain(siteData!);

    const [value, setValue] = useState(fullEmailAddress(membersSupportAddress?.toString() || '', siteData!));

    const updateSupportAddress: FocusEventHandler<HTMLInputElement> = (e) => {
        let supportAddress = e.target.value;

        let settingValue = emailDomain && supportAddress === `noreply@${emailDomain}` ? 'noreply' : supportAddress;

        updateSetting('members_support_address', settingValue);
        setValue(fullEmailAddress(settingValue, siteData!));
    };

    useEffect(() => {
        setValue(fullEmailAddress(membersSupportAddress?.toString() || '', siteData!));
    }, [membersSupportAddress, siteData]);

    return <div className='mt-7'><Form>
        <TextField title='Support email address' value={value} onBlur={updateSupportAddress} onChange={e => setValue(e.target.value)} />
    </Form></div>;
};

export default AccountPage;
