import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const DefaultRecipients: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    const values = (
        <SettingGroupContent
            values={[
                {
                    heading: 'Default Newsletter recipients',
                    key: 'default-recipients',
                    value: 'Whoever has access to the post'
                }
            ]}
        />
    );

    const inputs = (
        <SettingGroupContent>
            
        </SettingGroupContent>
    );

    return (
        <SettingGroup 
            description='When you publish new content, who do you usually want to send it to?'
            state={currentState} 
            title='Default recipients' 
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : inputs}
        </SettingGroup>
    );
};

export default DefaultRecipients;