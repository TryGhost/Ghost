import BulkEmail from './BulkEmail';
import DefaultRecipients from './default-recipients';
import EnableNewsletters from './enable-newsletters';
import Newsletters from './newsletters';
import React from 'react';
import SearchableSection from '../../searchable-section';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';

export const searchKeywords = {
    enableNewsletters: ['emails', 'newsletters', 'newsletter sending', 'enable', 'disable', 'turn on', 'turn off'],
    newsletters: ['newsletters', 'emails', 'design', 'customization'],
    defaultRecipients: ['newsletters', 'default recipients', 'emails'],
    bulkEmail: ['mailgun', 'emails', 'newsletters', 'postmark'],
    newslettersNavMenu: ['emails', 'newsletters', 'newsletter sending', 'enable', 'disable', 'turn on', 'turn off', 'design', 'customization', 'default recipients', 'emails', 'mailgun', 'tips', 'donations', 'one time', 'payment']
};

const EmailSettings: React.FC = () => {
    const {settings} = useGlobalData();
    const [newslettersEnabled] = getSettingValues(settings, ['editor_default_email_recipients']) as [string];

    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Email newsletter'>
            <EnableNewsletters keywords={searchKeywords.enableNewsletters} />
            {newslettersEnabled !== 'disabled' && (
                <>
                    <DefaultRecipients keywords={searchKeywords.defaultRecipients} />
                    <Newsletters keywords={searchKeywords.newsletters} />
                    <BulkEmail keywords={searchKeywords.bulkEmail} />
                </>
            )}
        </SearchableSection>
    );
};

export default EmailSettings;
