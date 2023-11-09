import AnnouncementBar from './AnnouncementBar';
import DesignSetting from './DesignSetting';
import Navigation from './Navigation';
import React from 'react';
import SearchableSection from '../../SearchableSection';

export const searchKeywords = {
    design: ['site', 'logo', 'cover', 'colors', 'fonts', 'background', 'themes', 'appearance', 'style', 'design & branding', 'design and branding'],
    navigation: ['site', 'navigation', 'menus', 'primary', 'secondary', 'links'],
    announcementBar: ['site', 'announcement bar', 'important', 'banner']
};

const SiteSettings: React.FC = () => {
    return (
        <>
            <SearchableSection keywords={Object.values(searchKeywords).flat()} title="Site">
                <DesignSetting keywords={searchKeywords.design} />
                <Navigation keywords={searchKeywords.navigation} />
                <AnnouncementBar keywords={searchKeywords.announcementBar} />
            </SearchableSection>
        </>
    );
};

export default SiteSettings;
