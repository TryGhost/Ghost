import React from 'react';
import SidebarNavSection from './sidebar/SidebarNavSection';
import SidebarNavItem from './sidebar/SidebarNavItem';

const Sidebar: React.FC = () => {
    return (
        <div className="hidden md:block mt-5">
            <SidebarNavSection name="General">
                <SidebarNavItem name="Title and description" />
                <SidebarNavItem name="Timezone" />
                <SidebarNavItem name="Publication language" />
                <SidebarNavItem name="Meta data" />
                <SidebarNavItem name="Twitter card" />
                <SidebarNavItem name="Facebook card" />
                <SidebarNavItem name="Social accounts" />
                <SidebarNavItem name="Make this site private" />
                <SidebarNavItem name="Users and permissions" />
            </SidebarNavSection>

            <SidebarNavSection name="Site">
                <SidebarNavItem name="Branding and design" />
                <SidebarNavItem name="Navigation" />
            </SidebarNavSection>

            <SidebarNavSection name="Membership">
                <SidebarNavItem name="Portal" />
                <SidebarNavItem name="Access" />
                <SidebarNavItem name="Tiers" />
                <SidebarNavItem name="Analytics" />
            </SidebarNavSection>

            <SidebarNavSection name="Email newsletters">
                <SidebarNavItem name="Newsletter sending" />
                <SidebarNavItem name="Newsletters" />
                <SidebarNavItem name="Default recipients" />
            </SidebarNavSection>

            <SidebarNavSection name="Advanced">
                <SidebarNavItem name="Integrations" />
                <SidebarNavItem name="Code injection" />
                <SidebarNavItem name="Labs" />
                <SidebarNavItem name="History" />
            </SidebarNavSection>
        </div>
    );
}

export default Sidebar;