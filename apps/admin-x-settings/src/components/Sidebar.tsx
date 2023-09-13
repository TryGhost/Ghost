import Icon from '../admin-x-ds/global/Icon';
import React from 'react';
import SettingNavItem from '../admin-x-ds/settings/SettingNavItem';
import SettingNavSection from '../admin-x-ds/settings/SettingNavSection';
import TextField from '../admin-x-ds/global/form/TextField';
import useFeatureFlag from '../hooks/useFeatureFlag';
import useRouting from '../hooks/useRouting';
import {getSettingValues} from '../api/settings';
import {isEditorUser} from '../api/users';
import {useGlobalData} from './providers/GlobalDataProvider';
import {useSearch} from './providers/ServiceProvider';

const Sidebar: React.FC = () => {
    const {filter, setFilter} = useSearch();
    const {updateRoute} = useRouting();

    const {settings, config, currentUser} = useGlobalData();
    const [newslettersEnabled] = getSettingValues(settings, ['editor_default_email_recipients']) as [string];

    const handleSectionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        setFilter('');
        updateRoute(e.currentTarget.name);
    };

    const hasTipsAndDonations = useFeatureFlag('tipsAndDonations');
    const hasRecommendations = useFeatureFlag('recommendations');

    const updateSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(e.target.value);

        if (e.target.value) {
            document.getElementById('admin-x-root')?.scrollTo({top: 0, left: 0});
        }
    };

    // Editors can only see staff settings, so no point in showing navigation
    if (isEditorUser(currentUser)) {
        return null;
    }

    return (
        <div className='no-scrollbar tablet:h-[calc(100vh-5vmin-84px)] tablet:w-[240px] tablet:overflow-y-scroll'>
            <div className='relative mb-10 md:pt-4 tablet:pt-[32px]'>
                <Icon className='absolute top-2 md:top-6 tablet:top-10' colorClass='text-grey-500' name='magnifying-glass' size='sm' />
                <TextField autoComplete="off" className='border-b border-grey-500 bg-transparent px-3 py-1.5 pl-[24px] text-sm dark:text-white' placeholder="Search" title="Search" value={filter} hideTitle unstyled onChange={updateSearch} />
            </div>
            <div className="hidden tablet:!visible tablet:!block">
                <SettingNavSection title="General">
                    <SettingNavItem navid='title-and-description' title="Title and description" onClick={handleSectionClick} />
                    <SettingNavItem navid='timezone' title="Timezone" onClick={handleSectionClick} />
                    <SettingNavItem navid='publication-language' title="Publication language" onClick={handleSectionClick} />
                    <SettingNavItem navid='metadata' title="Meta data" onClick={handleSectionClick} />
                    <SettingNavItem navid='twitter' title="Twitter card" onClick={handleSectionClick} />
                    <SettingNavItem navid='facebook' title="Facebook card" onClick={handleSectionClick} />
                    <SettingNavItem navid='social-accounts' title="Social accounts" onClick={handleSectionClick} />
                    <SettingNavItem navid='locksite' title="Make this site private" onClick={handleSectionClick} />
                    <SettingNavItem navid='users' title="Staff" onClick={handleSectionClick} />
                </SettingNavSection>

                <SettingNavSection title="Site">
                    {/* <SettingNavItem navid='theme' title="Theme" onClick={handleSectionClick} /> */}
                    <SettingNavItem navid='design' title="Branding and design" onClick={handleSectionClick} />
                    <SettingNavItem navid='navigation' title="Navigation" onClick={handleSectionClick} />
                    <SettingNavItem navid='announcement-bar' title="Announcement bar" onClick={handleSectionClick} />
                </SettingNavSection>

                <SettingNavSection title="Membership">
                    <SettingNavItem navid='portal' title="Portal" onClick={handleSectionClick} />
                    <SettingNavItem navid='access' title="Access" onClick={handleSectionClick} />
                    <SettingNavItem navid='tiers' title="Tiers" onClick={handleSectionClick} />
                    {hasTipsAndDonations && <SettingNavItem navid='tips-or-donations' title="Tips or donations" onClick={handleSectionClick} />}
                    <SettingNavItem navid='embed-signup-form' title="Embeddable signup form" onClick={handleSectionClick} />
                    {hasRecommendations && <SettingNavItem navid='recommendations' title="Recommendations" onClick={handleSectionClick} />}
                    <SettingNavItem navid='analytics' title="Analytics" onClick={handleSectionClick} />
                </SettingNavSection>

                <SettingNavSection title="Email newsletter">
                    <SettingNavItem navid='enable-newsletters' title="Newsletter sending" onClick={handleSectionClick} />
                    {newslettersEnabled !== 'disabled' && (
                        <>
                            <SettingNavItem navid='newsletters' title="Newsletters" onClick={handleSectionClick} />
                            <SettingNavItem navid='default-recipients' title="Default recipients" onClick={handleSectionClick} />
                            {!config.mailgunIsConfigured && <SettingNavItem navid='mailgun' title="Mailgun settings" onClick={handleSectionClick} />}
                        </>
                    )}
                </SettingNavSection>

                <SettingNavSection title="Advanced">
                    <SettingNavItem navid='integrations' title="Integrations" onClick={handleSectionClick} />
                    <SettingNavItem navid='code-injection' title="Code injection" onClick={handleSectionClick} />
                    <SettingNavItem navid='labs' title="Labs" onClick={handleSectionClick} />
                    <SettingNavItem navid='history' title="History" onClick={handleSectionClick} />
                </SettingNavSection>
            </div>
        </div>
    );
};

export default Sidebar;
