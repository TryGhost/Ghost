import DesignSetting from './DesignSetting';
import Navigation from './Navigation';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';
import Theme from './Theme';

const SiteSettings: React.FC = () => {
    return (
        <>
            <SettingSection groups={[
                {
                    element: <Theme />,
                    searchKeywords: ['themes', 'design', 'appearance', 'style']
                },
                {
                    element: <DesignSetting />,
                    searchKeywords: ['design', 'branding', 'logo', 'cover', 'colors', 'fonts', 'background']
                },
                {
                    element: <Navigation />,
                    searchKeywords: ['navigation', 'menus', 'primary', 'secondary', 'links']
                }
            ]} title="Site" />
        </>
    );
};

export default SiteSettings;
