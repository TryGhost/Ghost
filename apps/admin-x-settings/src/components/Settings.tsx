import React, {useContext} from 'react';
import SettingsSections from './SettingsSections';
import {SettingsContext} from './providers/SettingsProvider';

import Access from './settings/membership/Access';
import Analytics from './settings/membership/Analytics';
import DefaultRecipients from './settings/email/DefaultRecipients';
import DesignSetting from './settings/site/DesignSetting';
import Facebook from './settings/general/Facebook';
import LockSite from './settings/general/LockSite';
import MailGun from './settings/email/Mailgun';
import Metadata from './settings/general/Metadata';
import Navigation from './settings/site/Navigation';
import PublicationLanguage from './settings/general/PublicationLanguage';
import SocialAccounts from './settings/general/SocialAccounts';
import Theme from './settings/site/Theme';
import TimeZone from './settings/general/TimeZone';
import TitleAndDescription from './settings/general/TitleAndDescription';
import Twitter from './settings/general/Twitter';
import Users from './settings/general/Users';

const Settings: React.FC = () => {
    const {settings} = useContext(SettingsContext) || {};

    // Show loader while settings is first fetched
    if (!settings) {
        return (
            <div className="flex h-full flex-col items-center justify-center">
                <div className="text-center text-2xl font-bold">Loading...</div>
            </div>
        );
    }

    return <SettingsSections sections={[
        {
            title: 'General',
            groups: [
                {component: TitleAndDescription, searchKeywords: ['title and description', 'site title', 'site description']},
                {component: TimeZone, searchKeywords: ['time', 'date', 'site timezone', 'time zone']},
                {component: PublicationLanguage, searchKeywords: ['publication language', 'locale']},
                {component: Metadata, searchKeywords: ['metadata', 'title', 'description', 'search', 'engine', 'google']},
                {component: Twitter, searchKeywords: ['twitter card', 'structured data', 'rich cards']},
                {component: Facebook, searchKeywords: ['facebook card', 'structured data', 'rich cards']},
                {component: SocialAccounts, searchKeywords: ['social accounts', 'facebook', 'twitter', 'structured data', 'rich cards']},
                {component: LockSite, searchKeywords: ['private', 'password', 'lock site']},
                {component: Users, searchKeywords: ['users and permissions', 'roles', 'staff']}
            ]
        },
        {
            title: 'Site',
            groups: [
                {component: Theme, searchKeywords: ['themes', 'design', 'appearance', 'style']},
                {component: DesignSetting, searchKeywords: ['design', 'branding', 'logo', 'cover', 'colors', 'fonts', 'background']},
                {component: Navigation, searchKeywords: ['navigation', 'menus', 'primary', 'secondary', 'links']}
            ]
        },
        {
            title: 'Membership',
            groups: [
                {component: Access, searchKeywords: ['access', 'subscription', 'post']},
                {component: Analytics, searchKeywords: ['analytics', 'tracking', 'privacy']}
            ]
        },
        {
            title: 'Email newsletters',
            groups: [
                {component: DefaultRecipients, searchKeywords: ['newsletter', 'default recipients', 'email']},
                {component: MailGun, searchKeywords: ['mailgun', 'email']}
            ]
        }
    ]} />;
};

export default Settings;
