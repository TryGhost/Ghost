import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const Access: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    const values = (
        <SettingGroupContent
            values={[
                {
                    heading: 'Subscription access',
                    key: 'subscription-access',
                    value: 'Anyone'
                },
                {
                    heading: 'Default post access',
                    key: 'default-post-access',
                    value: 'Public'
                },
                {
                    heading: 'Commenting',
                    key: 'commenting',
                    value: 'Nobody'
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
            description='Set up default access options for subscription and posts'
            state={currentState} 
            title='Access' 
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : inputs}
        </SettingGroup>
    );
};

export default Access;