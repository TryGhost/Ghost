import Link from '../../../admin-x-ds/global/Link';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const MailGun: React.FC = () => {
    const [currentState, setCurrentState] = useState<TSettingGroupStates>('view');

    const handleStateChange = (newState: TSettingGroupStates) => {
        setCurrentState(newState);
    };

    return (
        <SettingGroup 
            description={<>The Mailgun API is used for bulk email newsletter delivery. <Link href='https://ghost.org/docs/faq/mailgun-newsletters/' target='_blank'>Why is this required?</Link></>}
            state={currentState} 
            title='Make site private' 
            onStateChange={handleStateChange}
        >
            Values and inputs
        </SettingGroup>
    );
};

export default MailGun;