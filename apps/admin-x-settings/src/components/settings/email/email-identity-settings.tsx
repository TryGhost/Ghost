import EmailIdentity from './email-identity';
import MemberEmails from '../membership/member-emails';
import React from 'react';
import SearchableSection from '../../searchable-section';

export const searchKeywords = {
    emails: ['emails', 'sender', 'from address', 'reply-to', 'email address', 'sender name'],
    memberEmails: ['welcome email', 'email', 'signup', 'new user', 'new member', 'account', 'automated']
};

const EmailIdentitySettings: React.FC = () => {
    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Email'>
            <EmailIdentity keywords={searchKeywords.emails} />
            <MemberEmails keywords={searchKeywords.memberEmails} />
        </SearchableSection>
    );
};

export default EmailIdentitySettings;
