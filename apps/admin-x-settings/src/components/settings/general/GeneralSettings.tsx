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

const GeneralSettings: React.FC = () => {
    return (
        <SettingSection groups={[
            {
                element: <TitleAndDescription />,
                searchKeywords: ['title and description', 'site title', 'site description']
            },
            {
                element: <TimeZone />,
                searchKeywords: ['time', 'date', 'site timezone', 'time zone']
            },
            {
                element: <PublicationLanguage />,
                searchKeywords: ['publication language', 'locale']
            },
            {
                element: <Metadata />,
                searchKeywords: ['metadata', 'title', 'description', 'search', 'engine', 'google']
            },
            {
                element: <Twitter />,
                searchKeywords: ['twitter card', 'structured data', 'rich cards']
            },
            {
                element: <Facebook />,
                searchKeywords: ['facebook card', 'structured data', 'rich cards']
            },
            {
                element: <SocialAccounts />,
                searchKeywords: ['social accounts', 'facebook', 'twitter', 'structured data', 'rich cards']
            },
            {
                element: <LockSite />,
                searchKeywords: ['private', 'password', 'lock site']
            },
            {
                element: <Users />,
                searchKeywords: ['users and permissions', 'roles', 'staff']
            }
        ]} title="General" />
    );
};

export default GeneralSettings;
