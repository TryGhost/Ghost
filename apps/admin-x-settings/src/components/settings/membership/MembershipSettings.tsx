import Access from './Access';
import Analytics from './Analytics';
import Portal from './Portal';
import React from 'react';
import SearchableSection from '../../SearchableSection';
import Spam from './Spam';
import Tiers from './Tiers';

export const searchKeywords = {
    portal: ['membership', 'portal', 'signup', 'sign up', 'signin', 'sign in', 'login', 'account', 'membership', 'support', 'email', 'address', 'support email address', 'support address'],
    access: ['membership', 'default', 'access', 'subscription', 'post', 'membership', 'comments', 'commenting'],
    tiers: ['membership', 'tiers', 'payment', 'paid', 'stripe'],
    analytics: ['membership', 'analytics', 'tracking', 'privacy', 'membership'],
    spam: ['membership', 'signup', 'sign up', 'spam', 'blocked', 'domains', 'email']
};

const MembershipSettings: React.FC = () => {
    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Membership'>
            <Portal keywords={searchKeywords.portal} />
            <Access keywords={searchKeywords.access} />
            <Tiers keywords={searchKeywords.tiers} />
            <Analytics keywords={searchKeywords.analytics} />
            <Spam keywords={searchKeywords.spam} />
        </SearchableSection>
    );
};

export default MembershipSettings;
