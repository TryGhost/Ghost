import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const DefaultRecipients: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    return (
        <SettingGroup 
            description='When you publish new content, who do you usually want to send it to?'
            state={currentState} 
            title='Make site private' 
            onStateChange={handleStateChange}
        >
            Values and inputs
        </SettingGroup>
    );
};

export default DefaultRecipients;