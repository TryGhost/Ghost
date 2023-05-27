import React from 'react';
import SettingNavItem from '../admin-x-ds/settings/SettingNavItem';
import SettingNavSection from '../admin-x-ds/settings/SettingNavSection';

const Sidebar: React.FC = () => {
    return (
        <div className="hidden md:!visible md:!block md:h-[calc(100vh-5vmin-84px)] md:w-[300px] md:overflow-y-scroll md:pt-[32px]">
            <SettingNavSection title="General">
                <SettingNavItem href="#title-and-description" title="Title and description" />
                <SettingNavItem title="Timezone" />
                <SettingNavItem title="Publication language" />
                <SettingNavItem title="Meta data" />
                <SettingNavItem title="Twitter card" />
                <SettingNavItem title="Facebook card" />
                <SettingNavItem title="Social accounts" />
                <SettingNavItem title="Make this site private" />
                <SettingNavItem title="Users and permissions" />
            </SettingNavSection>

            <SettingNavSection title="Site">
                <SettingNavItem title="Branding and design" />
                <SettingNavItem title="Navigation" />
            </SettingNavSection>

            <SettingNavSection title="Membership">
                <SettingNavItem title="Portal" />
                <SettingNavItem title="Access" />
                <SettingNavItem title="Tiers" />
                <SettingNavItem title="Analytics" />
            </SettingNavSection>

            <SettingNavSection title="Email newsletters">
                <SettingNavItem title="Newsletter sending" />
                <SettingNavItem title="Newsletters" />
                <SettingNavItem title="Default recipients" />
            </SettingNavSection>

            <SettingNavSection title="Advanced">
                <SettingNavItem title="Integrations" />
                <SettingNavItem title="Code injection" />
                <SettingNavItem title="Labs" />
                <SettingNavItem title="History" />
            </SettingNavSection>
        </div>
    );
};

export default Sidebar;