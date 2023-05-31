import DesignModal from './modals/DesignModal';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const SiteSettings: React.FC = () => {
    return (
        <>
            <SettingSection title="Site">
                <DesignModal />
            </SettingSection>
        </>
    );
};

export default SiteSettings;