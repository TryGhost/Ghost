import Icon from '../admin-x-ds/global/Icon';
import React from 'react';
import SettingNavItem from '../admin-x-ds/settings/SettingNavItem';
import SettingNavSection from '../admin-x-ds/settings/SettingNavSection';
import TextField from '../admin-x-ds/global/form/TextField';
import useRouting from '../hooks/useRouting';
import {useSearch} from './providers/ServiceProvider';

const Sidebar: React.FC = () => {
    const {filter, setFilter} = useSearch();
    const {updateRoute} = useRouting();

    const handleSectionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        updateRoute(e.currentTarget.name);
    };

    return (
        <div className="hidden md:!visible md:!block md:h-[calc(100vh-5vmin-84px)] md:w-[240px] md:overflow-y-scroll md:pt-[32px]">
            <div className='relative mb-10'>
                <Icon className='absolute top-2' colorClass='text-grey-500' name='magnifying-glass' size='sm' />
                <TextField autoComplete="off" className='border-b border-grey-500 px-3 py-1.5 pl-[24px] text-sm' placeholder="Search" title="Search" value={filter} hideTitle unstyled onChange={e => setFilter(e.target.value)} />
            </div>

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
                {/* <SettingNavItem navid='theme' title="Theme" onClick={handleSectionClick} /> */}
                <SettingNavItem navid='design' title="Branding and design" onClick={handleSectionClick} />
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
