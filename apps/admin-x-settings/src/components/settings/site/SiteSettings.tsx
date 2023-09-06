import AnnouncementBar from './AnnouncementBar';
import DesignSetting from './DesignSetting';
import Navigation from './Navigation';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
// import Theme from './Theme';

const searchKeywords = {
    theme: ['themes', 'design', 'appearance', 'style'],
    design: ['design', 'branding', 'logo', 'cover', 'colors', 'fonts', 'background'],
    navigation: ['navigation', 'menus', 'primary', 'secondary', 'links'],
    announcementBar: ['announcement', 'bar', 'important', 'banner']
};

const SiteSettings: React.FC = () => {
    return (
        <>
            <SettingSection keywords={Object.values(searchKeywords).flat()} title="Site">
                {/* <Theme keywords={searchKeywords.theme} /> */}
                <DesignSetting keywords={searchKeywords.design} />
                <Navigation keywords={searchKeywords.navigation} />
                <AnnouncementBar keywords={searchKeywords.announcementBar} />
            </SettingSection>
        </>
    );
};

export default SiteSettings;
