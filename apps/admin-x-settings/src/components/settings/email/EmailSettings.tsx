import DefaultRecipients from './DefaultRecipients';
import EnableNewsletters from './EnableNewsletters';
import MailGun from './Mailgun';
import Newsletters from './Newsletters';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import {getSettingValues} from '../../../api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

export const searchKeywords = {
    enableNewsletters: ['newsletters', 'newsletter sending', 'enable', 'disable', 'turn on', 'turn off'],
    newsletters: ['newsletters', 'emails'],
    defaultRecipients: ['newsletters', 'default recipients', 'emails'],
    mailgun: ['mailgun', 'emails', 'newsletters']
};

const EmailSettings: React.FC = () => {
    const {settings, config} = useGlobalData();
    const [newslettersEnabled] = getSettingValues(settings, ['editor_default_email_recipients']) as [string];

    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Email newsletter'>
            <EnableNewsletters keywords={searchKeywords.enableNewsletters} />
            {newslettersEnabled !== 'disabled' && (
                <>
                    <DefaultRecipients keywords={searchKeywords.defaultRecipients} />
                    <Newsletters keywords={searchKeywords.newsletters} />
                    {!config.mailgunIsConfigured && <MailGun keywords={searchKeywords.mailgun} />}
                </>
            )}
        </SettingSection>
    );
};

export default EmailSettings;
