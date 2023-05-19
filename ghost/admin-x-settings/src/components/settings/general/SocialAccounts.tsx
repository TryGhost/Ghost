import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const SocialAccounts: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    return (
        <SettingGroup 
            description='Link your social accounts for full structured data and rich card support' 
            state={currentState} 
            title='Social accounts'
            onStateChange={handleStateChange}
        >
            Values and inputs
        </SettingGroup>
    );
};

export default SocialAccounts;