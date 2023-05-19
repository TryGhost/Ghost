import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const LockSite: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    return (
        <SettingGroup 
            description='Enable protection with a simple shared password. All search engine optimization and social features will be disabled.'
            state={currentState} 
            title='Make site private' 
            onStateChange={handleStateChange}
        >
            Values and inputs
        </SettingGroup>
    );
};

export default LockSite;