import Link from '../../../admin-x-ds/global/Link';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/TextField';
import Toggle from '../../../admin-x-ds/global/Toggle';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const LockSite: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');
    const [passwordEnabled, setPasswordEnabled] = useState<boolean>(false);

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordEnabled(e.target.checked);
    };

    const values = (
        <SettingGroupContent
            values={[
                {
                    key: 'facebook',
                    value: 'Your site is not password protected'
                }
            ]}
        />
    );

    const inputs = (
        <SettingGroupContent>
            <Toggle 
                direction='rtl'
                hint='All search engine optimization and social features will be disabled.'
                id='enable-password-protection'
                label='Enable password protection'
                onChange={handleToggleChange}
            />
            {passwordEnabled && 
                <TextField
                    hint={<>A private RSS feed is available at <Link href="http://localhost:2368/51aa059ba6eb50c24c14047d4255ac/rss"></Link></>}
                    placeholder="Enter password"
                    value=""
                    onChange={() => {}}
                />
            }
        </SettingGroupContent>
    );

    return (
        <SettingGroup 
            description='Enable protection with a simple shared password.'
            state={currentState} 
            title='Make site private' 
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : inputs}
        </SettingGroup>
    );
};

export default LockSite;