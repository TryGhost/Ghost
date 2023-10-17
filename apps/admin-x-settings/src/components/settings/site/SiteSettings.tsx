import AnnouncementBar from './AnnouncementBar';
import DesignSetting from './DesignSetting';
import Navigation from './Navigation';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

export const searchKeywords = {
    design: ['logo', 'cover', 'colors', 'fonts', 'background', 'themes', 'appearance', 'style', 'design & branding', 'design and branding'],
    navigation: ['navigation', 'menus', 'primary', 'secondary', 'links'],
    announcementBar: ['announcement bar', 'important', 'banner']
};

const SiteSettings: React.FC = () => {
    return (
        <>
            <SettingSection keywords={Object.values(searchKeywords).flat()} title="Site">
                <DesignSetting keywords={searchKeywords.design} />
                <Navigation keywords={searchKeywords.navigation} />
                <AnnouncementBar keywords={searchKeywords.announcementBar} />
            </SettingSection>
        </>
    );
};

export default SiteSettings;
