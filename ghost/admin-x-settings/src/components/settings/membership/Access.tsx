import Dropdown from '../../../admin-x-ds/global/Dropdown';
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
                    value: 'Anyone can sign up'
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

    const form = (
        <SettingGroupContent columns={1}>
            <Dropdown
                defaultSelectedOption='option-1'
                hint='Who should be able to subscribe to your site?'
                options={[
                    {value: 'option-1', label: 'Anyone can sign up'},
                    {value: 'option-2', label: 'Only people I invite'},
                    {value: 'option-3', label: 'Nobody'}
                ]}
                title="Subscription access"
                onSelect={() => {}}
            />
            <Dropdown
                defaultSelectedOption='option-1'
                hint='When a new post is created, who should have access?'
                options={[
                    {value: 'option-1', label: 'Public'},
                    {value: 'option-2', label: 'Members only'},
                    {value: 'option-3', label: 'Paid-members only'},
                    {value: 'option-4', label: 'Specific tears'}
                ]}
                title="Default post access"
                onSelect={() => {}}
            />
            <Dropdown
                defaultSelectedOption='option-1'
                hint='Who can comment on posts?'
                options={[
                    {value: 'option-1', label: 'All members'},
                    {value: 'option-2', label: 'Paid-members only'},
                    {value: 'option-3', label: 'All members'}
                ]}
                title="Commenting"
                onSelect={() => {}}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup 
            description='Set up default access options for subscription and posts'
            state={currentState} 
            title='Access' 
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : form}
        </SettingGroup>
    );
};

export default Access;