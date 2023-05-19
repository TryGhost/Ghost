import Dropdown from '../../../admin-x-ds/global/Dropdown';
import Link from '../../../admin-x-ds/global/Link';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/TextField';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const MailGun: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    const values = (
        <SettingGroupContent
            columns={2}
            values={[
                {
                    heading: 'Status',
                    key: 'status',
                    value: 'Mailgun is not set up'
                }
            ]}
        />
    );

    const inputs = (
        <SettingGroupContent>
            <div className='grid grid-cols-2 gap-6'>
                <Dropdown
                    defaultSelectedOption='option-1'
                    options={[
                        {value: 'option-1', label: 'US'},
                        {value: 'option-2', label: 'EU'}
                    ]}
                    title="Mailgun region"
                    onSelect={() => {}}
                />
                <TextField 
                    title='Mailgun domain'
                />
                <div className='col-span-2'>
                    <TextField 
                        hint={<>Find your Mailgun API keys<Link href="https://app.mailgun.com/app/account/security/api_keys" target="_blank">here</Link></>}
                        title='Mailgun private API key'
                    />
                </div>
            </div>
        </SettingGroupContent>
    );

    return (
        <SettingGroup 
            description={<>The Mailgun API is used for bulk email newsletter delivery. <Link href='https://ghost.org/docs/faq/mailgun-newsletters/' target='_blank'>Why is this required?</Link></>}
            state={currentState} 
            title='Mailgun' 
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : inputs}
        </SettingGroup>
    );
};

export default MailGun;