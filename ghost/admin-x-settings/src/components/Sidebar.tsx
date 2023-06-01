import React from 'react';
import SettingNavItem from '../admin-x-ds/settings/SettingNavItem';
import SettingNavSection from '../admin-x-ds/settings/SettingNavSection';

const Sidebar: React.FC = () => {
    const handleSectionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        const element = document.getElementById(e.currentTarget.name);
        if (element) {
            element.scrollIntoView({behavior: 'smooth'});
        }
    }

    return (
        <div className="hidden md:!visible md:!block md:h-[calc(100vh-5vmin-84px)] md:w-[300px] md:overflow-y-scroll md:pt-[32px]">
            <SettingNavSection title="General">
                <SettingNavItem onClick={handleSectionClick} navid='title-and-description' title="Title and description" />
                <SettingNavItem onClick={handleSectionClick} navid='timezone' title="Timezone" />
                <SettingNavItem onClick={handleSectionClick} navid='publication-language' title="Publication language" />
                <SettingNavItem onClick={handleSectionClick} navid='metadata' title="Meta data" />
                <SettingNavItem onClick={handleSectionClick} navid='twitter' title="Twitter card" />
                <SettingNavItem onClick={handleSectionClick} navid='facebook' title="Facebook card" />
                <SettingNavItem onClick={handleSectionClick} navid='social-accounts' title="Social accounts" />
                <SettingNavItem onClick={handleSectionClick} navid='locksite' title="Make this site private" />
                <SettingNavItem onClick={handleSectionClick} navid='users' title="Users and permissions" />
            </SettingNavSection>

            <SettingNavSection title="Site">
                <SettingNavItem onClick={handleSectionClick} navid='branding-and-design' title="Branding and design" />
                <SettingNavItem onClick={handleSectionClick} navid='navigation' title="Navigation" />
            </SettingNavSection>

            <SettingNavSection title="Membership">
                <SettingNavItem onClick={handleSectionClick} navid='portal' title="Portal" />
                <SettingNavItem onClick={handleSectionClick} navid='access' title="Access" />
                <SettingNavItem onClick={handleSectionClick} navid='tiers' title="Tiers" />
                <SettingNavItem onClick={handleSectionClick} navid='analytics' title="Analytics" />
            </SettingNavSection>

            <SettingNavSection title="Email newsletters">
                <SettingNavItem onClick={handleSectionClick} navid='newsletter-sending' title="Newsletter sending" />
                <SettingNavItem onClick={handleSectionClick} navid='newsletters' title="Newsletters" />
                <SettingNavItem onClick={handleSectionClick} navid='default-recipients' title="Default recipients" />
                <SettingNavItem onClick={handleSectionClick} navid='mailgun' title="Mailgun settings" />
            </SettingNavSection>

            <SettingNavSection title="Advanced">
                <SettingNavItem onClick={handleSectionClick} navid='integrations' title="Integrations" />
                <SettingNavItem onClick={handleSectionClick} navid='code-injection' title="Code injection" />
                <SettingNavItem onClick={handleSectionClick} navid='labs' title="Labs" />
                <SettingNavItem onClick={handleSectionClick} navid='history' title="History" />
            </SettingNavSection>
        </div>
    );
};

export default Sidebar;