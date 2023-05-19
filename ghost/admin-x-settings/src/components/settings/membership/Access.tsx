import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const Access: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    return (
        <SettingGroup 
            description='Set up default access options for subscription and posts'
            state={currentState} 
            title='Access' 
            onStateChange={handleStateChange}
        >
            Values and inputs
        </SettingGroup>
    );
};

export default Access;