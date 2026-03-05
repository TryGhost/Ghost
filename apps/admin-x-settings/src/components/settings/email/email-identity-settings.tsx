import EmailIdentity from './email-identity';
import React from 'react';
import SearchableSection from '../../searchable-section';

export const searchKeywords = {
    emails: ['emails', 'sender', 'from address', 'reply-to', 'email address', 'sender name']
};

const EmailIdentitySettings: React.FC = () => {
    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Email'>
            <EmailIdentity keywords={searchKeywords.emails} />
        </SearchableSection>
    );
};

export default EmailIdentitySettings;
