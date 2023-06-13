import React from 'react';
import SettingNavItem from '../admin-x-ds/settings/SettingNavItem';
import SettingNavSection from '../admin-x-ds/settings/SettingNavSection';

const Sidebar: React.FC = () => {
    const handleSectionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        const element = document.getElementById(e.currentTarget.name);
        if (element) {
            element.scrollIntoView({behavior: 'smooth'});
        }
    };

    return (
        <div className="hidden md:!visible md:!block md:h-[calc(100vh-5vmin-84px)] md:w-[300px] md:overflow-y-scroll md:pt-[32px]">
            <SettingNavSection title="General">
                <SettingNavItem navid='title-and-description' title="Title and description" onClick={handleSectionClick} />
                <SettingNavItem navid='timezone' title="Timezone" onClick={handleSectionClick} />
                <SettingNavItem navid='publication-language' title="Publication language" onClick={handleSectionClick} />
                <SettingNavItem navid='metadata' title="Meta data" onClick={handleSectionClick} />
                <SettingNavItem navid='twitter' title="Twitter card" onClick={handleSectionClick} />
                <SettingNavItem navid='facebook' title="Facebook card" onClick={handleSectionClick} />
                <SettingNavItem navid='social-accounts' title="Social accounts" onClick={handleSectionClick} />
                <SettingNavItem navid='locksite' title="Make this site private" onClick={handleSectionClick} />
                <SettingNavItem navid='users' title="Users and permissions" onClick={handleSectionClick} />
            </SettingNavSection>

            <SettingNavSection title="Site">
                <SettingNavItem navid='theme' title="Theme" onClick={handleSectionClick} />
                <SettingNavItem navid='branding-and-design' title="Branding and design" onClick={handleSectionClick} />
                <SettingNavItem navid='navigation' title="Navigation" onClick={handleSectionClick} />
            </SettingNavSection>

            <SettingNavSection title="Membership">
                <SettingNavItem navid='portal' title="Portal" onClick={handleSectionClick} />
                <SettingNavItem navid='access' title="Access" onClick={handleSectionClick} />
                <SettingNavItem navid='tiers' title="Tiers" onClick={handleSectionClick} />
                <SettingNavItem navid='analytics' title="Analytics" onClick={handleSectionClick} />
            </SettingNavSection>

            <SettingNavSection title="Email newsletters">
                <SettingNavItem navid='newsletter-sending' title="Newsletter sending" onClick={handleSectionClick} />
                <SettingNavItem navid='newsletters' title="Newsletters" onClick={handleSectionClick} />
                <SettingNavItem navid='default-recipients' title="Default recipients" onClick={handleSectionClick} />
                <SettingNavItem navid='mailgun' title="Mailgun settings" onClick={handleSectionClick} />
            </SettingNavSection>

            <SettingNavSection title="Advanced">
                <SettingNavItem navid='integrations' title="Integrations" onClick={handleSectionClick} />
                <SettingNavItem navid='code-injection' title="Code injection" onClick={handleSectionClick} />
                <SettingNavItem navid='labs' title="Labs" onClick={handleSectionClick} />
                <SettingNavItem navid='history' title="History" onClick={handleSectionClick} />
            </SettingNavSection>
        </div>
    );
};

export default Sidebar;