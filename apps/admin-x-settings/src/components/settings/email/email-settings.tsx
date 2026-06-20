import DefaultRecipients from './default-recipients';
import EnableNewsletters from './enable-newsletters';
import MailGun from './mailgun';
import Newsletters from './newsletters';
import React from 'react';
import SearchableSection from '../../searchable-section';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';

export const searchKeywords = {
    enableNewsletters: ['emails', 'newsletters', 'newsletter sending', 'enable', 'disable', 'turn on', 'turn off'],
    newsletters: ['newsletters', 'emails', 'design', 'customization'],
    defaultRecipients: ['newsletters', 'default recipients', 'emails'],
    mailgun: ['mailgun', 'emails', 'newsletters']
};

const EmailSettings: React.FC = () => {
    const {settings, config} = useGlobalData();
    const [newslettersEnabled] = getSettingValues(settings, ['editor_default_email_recipients']) as [string];
    const hasNewslettersEnabled = newslettersEnabled !== 'disabled';
    const hasMailgun = hasNewslettersEnabled && !config.mailgunIsConfigured;
    const visibleSearchKeywords = [
        searchKeywords.enableNewsletters,
        ...(hasNewslettersEnabled ? [searchKeywords.defaultRecipients, searchKeywords.newsletters] : []),
        ...(hasMailgun ? [searchKeywords.mailgun] : [])
    ].flat();

    return (
        <SearchableSection keywords={visibleSearchKeywords} title='Newsletters'>
            <EnableNewsletters keywords={searchKeywords.enableNewsletters} />
            {hasNewslettersEnabled && (
                <>
                    <DefaultRecipients keywords={searchKeywords.defaultRecipients} />
                    <Newsletters keywords={searchKeywords.newsletters} />
                    {hasMailgun && <MailGun keywords={searchKeywords.mailgun} />}
                </>
            )}
        </SearchableSection>
    );
};

export default EmailSettings;
