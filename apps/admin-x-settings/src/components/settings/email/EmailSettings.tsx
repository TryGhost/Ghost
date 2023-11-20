import DefaultRecipients from './DefaultRecipients';
import EnableNewsletters from './EnableNewsletters';
import Newsletters from './Newsletters';
import BulkEmail from './BulkEmail';
import React from 'react';
import SearchableSection from '../../SearchableSection';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

export const searchKeywords = {
    enableNewsletters: ['emails', 'newsletters', 'newsletter sending', 'enable', 'disable', 'turn on', 'turn off'],
    newsletters: ['newsletters', 'emails'],
    defaultRecipients: ['newsletters', 'default recipients', 'emails'],
    bulkEmail: ['mailgun', 'emails', 'newsletters', 'postmark']
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
