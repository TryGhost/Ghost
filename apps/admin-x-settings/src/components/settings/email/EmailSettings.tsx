import DefaultRecipients from './DefaultRecipients';
import MailGun from './Mailgun';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const EmailSettings: React.FC = () => {
    return (
        <SettingSection groups={[
            {
                element: <DefaultRecipients />,
                searchKeywords: ['newsletter', 'default recipients', 'email']
            },
            {
                element: <MailGun />,
                searchKeywords: ['mailgun', 'email']
            }
        ]} title='Email newsletters' />
    );
};

export default EmailSettings;
