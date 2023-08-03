import DefaultRecipients from './DefaultRecipients';
import EnableNewsletters from './EnableNewsletters';
import MailGun from './Mailgun';
import Newsletters from './Newsletters';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import useSettings from '../../../hooks/useSettings';
import {getSettingValues} from '../../../utils/helpers';

const searchKeywords = {
    enableNewsletters: ['newsletter', 'enable', 'disable', 'turn on'],
    newsletters: ['newsletter', 'email'],
    defaultRecipients: ['newsletter', 'default recipients', 'email'],
    mailgun: ['mailgun', 'email']
};

const EmailSettings: React.FC = () => {
    const {settings} = useSettings();
    const [newslettersEnabled] = getSettingValues(settings, ['editor_default_email_recipients']) as [string];

    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Email newsletters'>
            <EnableNewsletters keywords={searchKeywords.enableNewsletters} />
            {newslettersEnabled !== 'disabled' && (
                <>
                    <Newsletters keywords={searchKeywords.newsletters} />
                    <DefaultRecipients keywords={searchKeywords.defaultRecipients} />
                    <MailGun keywords={searchKeywords.mailgun} />
                </>
            )}
        </SettingSection>
    );
};

export default EmailSettings;
