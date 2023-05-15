import React from 'react';
import SettingNavSection from './design-system/settings/SettingNavSection';
import SettingNavItem from './design-system/settings/SettingNavItem';

const Sidebar: React.FC = () => {
    return (
        <div className="hidden md:block mt-6">
            <SettingNavSection name="General">
                <SettingNavItem name="Title and description" />
                <SettingNavItem name="Timezone" />
                <SettingNavItem name="Publication language" />
                <SettingNavItem name="Meta data" />
                <SettingNavItem name="Twitter card" />
                <SettingNavItem name="Facebook card" />
                <SettingNavItem name="Social accounts" />
                <SettingNavItem name="Make this site private" />
                <SettingNavItem name="Users and permissions" />
            </SettingNavSection>

            <SettingNavSection name="Site">
                <SettingNavItem name="Branding and design" />
                <SettingNavItem name="Navigation" />
            </SettingNavSection>

            <SettingNavSection name="Membership">
                <SettingNavItem name="Portal" />
                <SettingNavItem name="Access" />
                <SettingNavItem name="Tiers" />
                <SettingNavItem name="Analytics" />
            </SettingNavSection>

            <SettingNavSection name="Email newsletters">
                <SettingNavItem name="Newsletter sending" />
                <SettingNavItem name="Newsletters" />
                <SettingNavItem name="Default recipients" />
            </SettingNavSection>

            <SettingNavSection name="Advanced">
                <SettingNavItem name="Integrations" />
                <SettingNavItem name="Code injection" />
                <SettingNavItem name="Labs" />
                <SettingNavItem name="History" />
            </SettingNavSection>
        </div>
    );
}

export default Sidebar;