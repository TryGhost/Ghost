import React from 'react';

import Analytics from '../membership/Analytics';
import Facebook from './Facebook';
import LockSite from './LockSite';
import Metadata from './Metadata';
import PublicationLanguage from './PublicationLanguage';
import SEOMeta from './SEOMeta';
import SearchableSection from '../../SearchableSection';
import SocialAccounts from './SocialAccounts';
import TimeZone from './TimeZone';
import TitleAndDescription from './TitleAndDescription';
import Twitter from './Twitter';
import Users from './Users';
import useFeatureFlag from '../../../hooks/useFeatureFlag';

// @TODO: Remove this for 6.0 -->
export const searchKeywords5x = {
    titleAndDescription: ['general', 'title and description', 'site title', 'site description', 'title & description'],
    timeZone: ['general', 'time', 'date', 'site timezone', 'time zone'],
    publicationLanguage: ['general', 'publication language', 'locale'],
    metadata: ['general', 'metadata', 'title', 'description', 'search', 'engine', 'google', 'meta data'],
    twitter: ['general', 'twitter card', 'structured data', 'rich cards', 'x card', 'social'],
    facebook: ['general', 'facebook card', 'structured data', 'rich cards', 'social'],
    socialAccounts: ['general', 'social accounts', 'facebook', 'twitter', 'structured data', 'rich cards'],
    lockSite: ['general', 'password protection', 'lock site', 'make this site private'],
    users: ['general', 'users and permissions', 'roles', 'staff', 'invite people', 'contributors', 'editors', 'authors', 'administrators']
};
// <--

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
    const ui60 = useFeatureFlag('ui60');

    if (!ui60) {
        return (
            <SearchableSection keywords={Object.values(searchKeywords5x).flat()} title="General settings">
                <TitleAndDescription keywords={searchKeywords5x.titleAndDescription} />
                <TimeZone keywords={searchKeywords5x.timeZone} />
                <PublicationLanguage keywords={searchKeywords5x.publicationLanguage} />
                <Metadata keywords={searchKeywords5x.metadata} />
                <Twitter keywords={searchKeywords5x.twitter} />
                <Facebook keywords={searchKeywords5x.facebook} />
                <SocialAccounts keywords={searchKeywords5x.socialAccounts} />
                <LockSite keywords={searchKeywords5x.lockSite} />
                <Users keywords={searchKeywords5x.users} />
            </SearchableSection>
        );
    }

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
