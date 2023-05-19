import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupInputs from '../../../admin-x-ds/settings/SettingGroupInputs';
import SettingGroupValues from '../../../admin-x-ds/settings/SettingGroupValues';
import TextField from '../../../admin-x-ds/global/TextField';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const SocialAccounts: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    const values = (
        <SettingGroupValues
            values={[
                {
                    heading: `URL of your publication's Facebook Page`,
                    key: 'facebook',
                    value: 'https://www.facebook.com/ghost'
                },
                {
                    heading: 'URL of your TWITTER PROFILE',
                    key: 'twitter',
                    value: 'https://twitter.com/ghost'
                }
            ]}
        />
    );

    const inputs = (
        <SettingGroupInputs>
            <TextField
                placeholder="https://www.facebook.com/ghost"
                title={`URL of your publication's Facebook Page`}
                value='https://www.facebook.com/ghost'
                onChange={() => {}}
            />
            <TextField
                placeholder="https://twitter.com/ghost"
                title="URL of your TWITTER PROFILE"
                value="https://twitter.com/ghost"
                onChange={() => {}}
            />
        </SettingGroupInputs>
    );

    return (
        <SettingGroup 
            description='Link your social accounts for full structured data and rich card support' 
            state={currentState} 
            title='Social accounts'
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : inputs}
        </SettingGroup>
    );
};

export default SocialAccounts;