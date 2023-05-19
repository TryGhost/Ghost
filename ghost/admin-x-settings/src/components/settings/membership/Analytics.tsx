import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const Analytics: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    return (
        <SettingGroup 
            description='Decide what data you collect from your members'
            state={currentState} 
            title='Analytics' 
            onStateChange={handleStateChange}
        >
            Values and inputs
        </SettingGroup>
    );
};

export default Analytics;