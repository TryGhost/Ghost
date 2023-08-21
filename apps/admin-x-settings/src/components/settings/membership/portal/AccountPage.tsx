import Form from '../../../../admin-x-ds/global/form/Form';
import React, {FocusEventHandler, useState} from 'react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import {Setting, SettingValue, getSettingValues} from '../../../../api/settings';
import {fullEmailAddress, getEmailDomain} from '../../../../api/site';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const AccountPage: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
}> = ({localSettings, updateSetting}) => {
    const [membersSupportAddress] = getSettingValues(localSettings, ['members_support_address']);

    const {siteData} = useGlobalData();
    const emailDomain = getEmailDomain(siteData!);

    const [value, setValue] = useState(fullEmailAddress(membersSupportAddress?.toString() || '', siteData!));

    const updateSupportAddress: FocusEventHandler<HTMLInputElement> = (e) => {
        let supportAddress = e.target.value;

        let settingValue = emailDomain && supportAddress === `noreply@${emailDomain}` ? 'noreply' : supportAddress;

        updateSetting('members_support_address', settingValue);
        setValue(fullEmailAddress(settingValue, siteData!));
    };

    return <Form marginTop>
        <TextField title='Support email address' value={value} onBlur={updateSupportAddress} onChange={e => setValue(e.target.value)} />
    </Form>;
};

export default AccountPage;
