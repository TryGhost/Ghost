import AnnouncementBar from './announcement-bar';
import ChangeTheme from './change-theme';
import DesignSetting from './design-setting';
import Navigation from './navigation';
import React from 'react';
import SearchableSection from '../../searchable-section';

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
