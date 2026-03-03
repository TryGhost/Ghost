import DefaultRecipients from './default-recipients';
import EnableNewsletters from './enable-newsletters';
import MailGun from './mailgun';
import Newsletters from './newsletters';
import React from 'react';
import SearchableSection from '../../searchable-section';
import {AutomationBtn} from './customization/automation-btn';
import {NewsletterBtn} from './customization/newsletter-btn';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseAutomatedEmails} from '@tryghost/admin-x-framework/api/automated-emails';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useGlobalData} from '../../providers/global-data-provider';

export const searchKeywords = {
    enableNewsletters: ['emails', 'newsletters', 'newsletter sending', 'enable', 'disable', 'turn on', 'turn off'],
    newsletters: ['newsletters', 'emails', 'design', 'customization'],
    defaultRecipients: ['newsletters', 'default recipients', 'emails'],
    mailgun: ['mailgun', 'emails', 'newsletters'],
    newslettersNavMenu: ['emails', 'newsletters', 'newsletter sending', 'enable', 'disable', 'turn on', 'turn off', 'design', 'customization', 'default recipients', 'emails', 'mailgun', 'tips', 'donations', 'one time', 'payment']
};

const EmailSettings: React.FC = () => {
    const {settings, config} = useGlobalData();
    const [newslettersEnabled] = getSettingValues(settings, ['editor_default_email_recipients']) as [string];
    const {data: {newsletters: activeNewsletters} = {}} = useBrowseNewsletters({
        searchParams: {filter: 'status:active', limit: '1'}
    });
    const {data: {automated_emails: automatedEmails} = {}} = useBrowseAutomatedEmails({
        searchParams: {limit: '1'}
    });

    const newsletterId = activeNewsletters?.[0]?.id;
    const automationId = automatedEmails?.[0]?.id;

    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Email newsletter'>
            <EnableNewsletters keywords={searchKeywords.enableNewsletters} />
            {newslettersEnabled !== 'disabled' && (
                <>
                    <DefaultRecipients keywords={searchKeywords.defaultRecipients} />
                    <Newsletters keywords={searchKeywords.newsletters} />
                </>
            )}
            {(newsletterId || automationId) && <div className='flex gap-4'>
                {newsletterId && <NewsletterBtn id={newsletterId} />}
                {automationId && <AutomationBtn id={automationId} />}
            </div>}
            {newslettersEnabled !== 'disabled' && (
                <>
                    {!config.mailgunIsConfigured && <MailGun keywords={searchKeywords.mailgun} />}
                </>
            )}
        </SearchableSection>
    );
};

export default EmailSettings;
