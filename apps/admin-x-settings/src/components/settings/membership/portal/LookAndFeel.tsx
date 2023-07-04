import Form from '../../../../admin-x-ds/global/form/Form';
import React from 'react';
import Select from '../../../../admin-x-ds/global/form/Select';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import {Setting, SettingValue} from '../../../../types/api';
import {getSettingValues} from '../../../../utils/helpers';

const LookAndFeel: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
}> = ({localSettings, updateSetting}) => {
    const [portalButton, portalButtonStyle, portalButtonSignupText] = getSettingValues(localSettings, ['portal_button', 'portal_button_style', 'portal_button_signup_text']);

    return <Form marginTop>
        <Toggle
            checked={Boolean(portalButton)}
            label='Show portal button'
            labelStyle='heading'
            onChange={e => updateSetting('portal_button', e.target.checked)}
        />
        <Select
            options={[
                {value: 'icon-and-text', label: 'Icon and text'},
                {value: 'icon-only', label: 'Icon only'},
                {value: 'text-only', label: 'Text only'}
            ]}
            selectedOption={portalButtonStyle as string}
            title='Portal button style'
            onSelect={option => updateSetting('portal_button_style', option)}
        />
        {portalButtonStyle?.toString()?.includes('icon') && <div className='red text-sm'>TODO: icon picker</div>}
        {portalButtonStyle?.toString()?.includes('text') &&
            <TextField
                title='Signup button text'
                value={portalButtonSignupText as string}
                onChange={e => updateSetting('portal_button_signup_text', e.target.value)}
            />
        }
    </Form>;
};

export default LookAndFeel;
