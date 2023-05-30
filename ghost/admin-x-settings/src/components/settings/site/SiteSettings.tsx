import Design from './Design';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const SiteSettings: React.FC = () => {
    return (
        <>
            <SettingSection title="Site">
                <Design />
            </SettingSection>
        </>
    );
};

export default SiteSettings;