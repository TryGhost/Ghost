import DefaultRecipients from './DefaultRecipients';
import MailGun from './Mailgun';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const EmailSettings: React.FC = () => {
    return (
        <SettingSection title='Email'>
            <DefaultRecipients />
            <MailGun />
        </SettingSection>
    );
};

export default EmailSettings;