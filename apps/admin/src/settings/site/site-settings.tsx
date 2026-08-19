import AnnouncementBar from './announcement-bar';
import ChangeTheme from './change-theme';
import DesignSetting from './design-setting';
import Navigation from './navigation';
import React from 'react';
import SearchableSection from '@/settings/components/searchable-section';
import {searchKeywords} from './search-keywords';

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
