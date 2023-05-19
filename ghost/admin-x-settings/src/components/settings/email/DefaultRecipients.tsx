import Dropdown from '../../../admin-x-ds/global/Dropdown';
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

    const form = (
        <SettingGroupContent columns={1}>
            <Dropdown
                defaultSelectedOption='option-1'
                hint='Who should be able to subscribe to your site?'
                options={[
                    {value: 'option-1', label: 'Whoever has access to the post'},
                    {value: 'option-2', label: 'All members'},
                    {value: 'option-3', label: 'Paid-members only'},
                    {value: 'option-4', label: 'Specific people'},
                    {value: 'option-5', label: 'Usually nobody'}
                ]}
                title="Subscription access"
                onSelect={() => {}}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup 
            description='When you publish new content, who do you usually want to send it to?'
            state={currentState} 
            title='Default recipients' 
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : form}
        </SettingGroup>
    );
};

export default DefaultRecipients;