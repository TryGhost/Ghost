import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupInputs from '../../../admin-x-ds/settings/SettingGroupInputs';
import SettingGroupValues from '../../../admin-x-ds/settings/SettingGroupValues';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const Analytics: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    const values = (
        <SettingGroupValues
            columns={2}
            values={[
                {
                    heading: 'Newsletter opens',
                    key: 'opens',
                    value: 'Enabled'
                },
                {
                    heading: 'Newsletter clicks',
                    key: 'clicks',
                    value: 'Enabled'
                },
                {
                    heading: 'Member sources',
                    key: 'sources',
                    value: 'Disabled'
                },
                {
                    heading: 'Outbound link tagging',
                    key: 'taggin',
                    value: 'Enabled'
                }
            ]}
        />
    );

    const inputs = (
        <SettingGroupInputs>
            
        </SettingGroupInputs>
    );

    return (
        <SettingGroup 
            description='Decide what data you collect from your members'
            state={currentState} 
            title='Analytics' 
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : inputs}
        </SettingGroup>
    );
};

export default Analytics;