import React from 'react';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import {Setting, SettingValue} from '../../../../types/api';
import {getSettingValues} from '../../../../utils/helpers';

const SignupOptions: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
}> = ({localSettings, updateSetting}) => {
    const [membersSignupAccess, portalName, portalSignupCheckboxRequired] = getSettingValues(localSettings, ['members_signup_access', 'portal_name', 'portal_signup_checkbox_required']);

    // This is a bit unclear in current admin, maybe we should add a message if the settings are disabled?
    const isDisabled = membersSignupAccess !== 'all';

    return <>
        <Toggle
            checked={Boolean(portalName)}
            disabled={isDisabled}
            label='Display name in signup form'
            onChange={e => updateSetting('portal_name', e.target.checked)}
        />
        <div>TODO: Tiers available at signup</div>
        <div>TODO: Display notice at signup (Koenig)</div>
        <Toggle
            checked={Boolean(portalSignupCheckboxRequired)}
            disabled={isDisabled}
            label='Require agreement'
            onChange={e => updateSetting('portal_signup_checkbox_required', e.target.checked)}
        />
    </>;
};

export default SignupOptions;
