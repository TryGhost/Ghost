import AnnouncementBar from './AnnouncementBar';
import ChangeTheme from './ChangeTheme';
import DesignSetting from './DesignSetting';
import Navigation from './Navigation';
import React from 'react';
import SearchableSection from '../../SearchableSection';

export const searchKeywords = {
    design: ['site', 'logo', 'cover', 'colors', 'fonts', 'background', 'themes', 'appearance', 'style', 'design & branding', 'design and branding'],
    theme: ['theme', 'template', 'upload'],
    navigation: ['site', 'navigation', 'menus', 'primary', 'secondary', 'links'],
    announcementBar: ['site', 'announcement bar', 'important', 'banner']
};

const SiteSettings: React.FC = () => {
    return (
        <>
            <SearchableSection keywords={Object.values(searchKeywords).flat()} title="Site">
                <DesignSetting keywords={searchKeywords.design} />
                <ChangeTheme keywords={searchKeywords.theme} />
                <Navigation keywords={searchKeywords.navigation} />
                <AnnouncementBar keywords={searchKeywords.announcementBar} />
            </SearchableSection>
        </>
    );
};

export default SiteSettings;
