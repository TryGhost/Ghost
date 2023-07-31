import DefaultRecipients from './DefaultRecipients';
import MailGun from './Mailgun';
import Newsletters from './Newsletters';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const searchKeywords = {
    newsletters: ['newsletter', 'email'],
    defaultRecipients: ['newsletter', 'default recipients', 'email'],
    mailgun: ['mailgun', 'email']
};

const EmailSettings: React.FC = () => {
    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Email newsletters'>
            <Newsletters keywords={searchKeywords.newsletters} />
            <DefaultRecipients keywords={searchKeywords.defaultRecipients} />
            <MailGun keywords={searchKeywords.mailgun} />
        </SettingSection>
    );
};

export default EmailSettings;
