import MemberWelcomeEmails from './MemberWelcomeEmails';
import React from 'react';
import SearchableSection from '../../SearchableSection';

export const searchKeywords = {
    welcomeEmails: ['membership', 'welcome', 'email', 'welcome email', 'member welcome', 'new member', 'signup email', 'member welcome emails']
};

const MemberWelcomeEmailsSettings: React.FC = () => {
    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Member welcome emails'>
            <MemberWelcomeEmails keywords={searchKeywords.welcomeEmails} />
        </SearchableSection>
    );
};

export default MemberWelcomeEmailsSettings;

