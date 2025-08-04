import React from 'react';

import Analytics from '../membership/Analytics';
import LockSite from './LockSite';
import PublicationLanguage from './PublicationLanguage';
import SEOMeta from './SEOMeta';
import SearchableSection from '../../SearchableSection';
import SocialAccounts from './SocialAccounts';
import TimeZone from './TimeZone';
import TitleAndDescription from './TitleAndDescription';
import Users from './Users';

export const searchKeywords = {
    titleAndDescription: ['general', 'title and description', 'site title', 'site description', 'title & description'],
    timeZone: ['general', 'time', 'date', 'site timezone', 'time zone'],
    publicationLanguage: ['general', 'publication language', 'locale'],
    users: ['general', 'users and permissions', 'roles', 'staff', 'invite people', 'contributors', 'editors', 'authors', 'administrators'],
    metadata: ['general', 'metadata', 'title', 'description', 'search', 'engine', 'google', 'meta data', 'twitter card', 'structured data', 'rich cards', 'x card', 'social', 'facebook card'],
    socialAccounts: ['general', 'social accounts', 'facebook', 'twitter', 'structured data', 'rich cards'],
    lockSite: ['general', 'password protection', 'lock site', 'make this site private'],
    analytics: ['membership', 'analytics', 'tracking', 'privacy', 'membership']
};

const GeneralSettings: React.FC = () => {
    // This section is going to be updated with merging Twitter and Facebook to the Metadata group,
    // that's why we're using a dedicated searchKeywords array for it.
    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title="General settings">
            <TitleAndDescription keywords={searchKeywords.titleAndDescription} />
            <TimeZone keywords={searchKeywords.timeZone} />
            <PublicationLanguage keywords={searchKeywords.publicationLanguage} />
            <Users keywords={searchKeywords.users} />
            <SEOMeta keywords={searchKeywords.metadata} />
            <SocialAccounts keywords={searchKeywords.socialAccounts} />
            <Analytics keywords={searchKeywords.analytics} />
            <LockSite keywords={searchKeywords.lockSite} />
        </SearchableSection>
    );
};

export default GeneralSettings;
