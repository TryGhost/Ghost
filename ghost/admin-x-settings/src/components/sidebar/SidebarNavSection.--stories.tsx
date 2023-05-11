import React from 'react';
import SidebarNavSection from './SidebarNavSection';
import SidebarNavItem from './SidebarNavItem';

export default {
    title: 'Layout/Sidebar navigation section',
    component: SidebarNavSection,
};

export const Default = () => (
    <SidebarNavSection name="Section title">
        <SidebarNavItem name="Menu item" />
    </SidebarNavSection>
)