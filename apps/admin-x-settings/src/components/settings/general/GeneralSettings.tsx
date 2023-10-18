import React from 'react';

import Facebook from './Facebook';
import LockSite from './LockSite';
import Metadata from './Metadata';
import PublicationLanguage from './PublicationLanguage';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import SocialAccounts from './SocialAccounts';
import TimeZone from './TimeZone';
import TitleAndDescription from './TitleAndDescription';
import Twitter from './Twitter';
import Users from './Users';

export const searchKeywords = {
    titleAndDescription: ['general', 'title and description', 'site title', 'site description', 'title & description'],
    timeZone: ['general', 'time', 'date', 'site timezone', 'time zone'],
    publicationLanguage: ['general', 'publication language', 'locale'],
    metadata: ['general', 'metadata', 'title', 'description', 'search', 'engine', 'google', 'meta data'],
    twitter: ['general', 'twitter card', 'structured data', 'rich cards', 'x card'],
    facebook: ['general', 'facebook card', 'structured data', 'rich cards'],
    socialAccounts: ['general', 'social accounts', 'facebook', 'twitter', 'structured data', 'rich cards'],
    lockSite: ['general', 'password', 'lock site', 'make this site private'],
    users: ['general', 'users and permissions', 'roles', 'staff']
};

const GeneralSettings: React.FC = () => {
    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title="General">
            <TitleAndDescription keywords={searchKeywords.titleAndDescription} />
            <TimeZone keywords={searchKeywords.timeZone} />
            <PublicationLanguage keywords={searchKeywords.publicationLanguage} />
            <Metadata keywords={searchKeywords.metadata} />
            <Twitter keywords={searchKeywords.twitter} />
            <Facebook keywords={searchKeywords.facebook} />
            <SocialAccounts keywords={searchKeywords.socialAccounts} />
            <LockSite keywords={searchKeywords.lockSite} />
            <Users keywords={searchKeywords.users} />
        </SettingSection>
    );
};

export default GeneralSettings;
