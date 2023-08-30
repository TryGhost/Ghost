import DesignSetting from './DesignSetting';
import Navigation from './Navigation';
import React from 'react';
import Recommendations from './Recommendations';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import useFeatureFlag from '../../../hooks/useFeatureFlag';
// import Theme from './Theme';

const searchKeywords = {
    theme: ['themes', 'design', 'appearance', 'style'],
    design: ['design', 'branding', 'logo', 'cover', 'colors', 'fonts', 'background'],
    navigation: ['navigation', 'menus', 'primary', 'secondary', 'links'],
    recommendations: ['recommendation', 'recommend', 'blog roll', 'recommending']
};

const SiteSettings: React.FC = () => {
    const hasRecommendations = useFeatureFlag('recommendations');
    return (
        <>
            <SettingSection keywords={Object.values(searchKeywords).flat()} title="Site">
                {/* <Theme keywords={searchKeywords.theme} /> */}
                <DesignSetting keywords={searchKeywords.design} />
                <Navigation keywords={searchKeywords.navigation} />
                {hasRecommendations && <Recommendations keywords={searchKeywords.recommendations} />}
            </SettingSection>
        </>
    );
};

export default SiteSettings;
