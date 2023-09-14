import Icon from '../admin-x-ds/global/Icon';
import React from 'react';
import SettingNavItem from '../admin-x-ds/settings/SettingNavItem';
import SettingNavSection from '../admin-x-ds/settings/SettingNavSection';
import TextField from '../admin-x-ds/global/form/TextField';
import useFeatureFlag from '../hooks/useFeatureFlag';
import useRouting from '../hooks/useRouting';
import {searchKeywords as advancedSearchKeywords} from './settings/advanced/AdvancedSettings';
import {searchKeywords as emailSearchKeywords} from './settings/email/EmailSettings';
import {searchKeywords as generalSearchKeywords} from './settings/general/GeneralSettings';
import {getSettingValues} from '../api/settings';
import {searchKeywords as membershipSearchKeywords} from './settings/membership/MembershipSettings';
import {searchKeywords as siteSearchKeywords} from './settings/site/SiteSettings';
import {useGlobalData} from './providers/GlobalDataProvider';
import {useSearch} from './providers/ServiceProvider';

const Sidebar: React.FC = () => {
    const {filter, setFilter} = useSearch();
    const {updateRoute} = useRouting();

    const {settings, config} = useGlobalData();
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

    return (
        <div className='no-scrollbar tablet:h-[calc(100vh-5vmin-84px)] tablet:w-[240px] tablet:overflow-y-scroll' id='admin-x-settings-sidebar'>
            <div className='relative mb-10 md:pt-4 tablet:pt-[32px]'>
                <Icon className='absolute top-2 md:top-6 tablet:top-10' colorClass='text-grey-500' name='magnifying-glass' size='sm' />
                <TextField autoComplete="off" className='border-b border-grey-500 bg-transparent px-3 py-1.5 pl-[24px] text-sm dark:text-white' placeholder="Search" title="Search" value={filter} hideTitle unstyled onChange={updateSearch} />
            </div>
            <div className="hidden tablet:!visible tablet:!block">
                <SettingNavSection keywords={Object.values(generalSearchKeywords).flat()} title="General">
                    <SettingNavItem keywords={generalSearchKeywords.titleAndDescription} navid='title-and-description' title="Title and description" onClick={handleSectionClick} />
                    <SettingNavItem keywords={generalSearchKeywords.timeZone} navid='timezone' title="Timezone" onClick={handleSectionClick} />
                    <SettingNavItem keywords={generalSearchKeywords.publicationLanguage} navid='publication-language' title="Publication language" onClick={handleSectionClick} />
                    <SettingNavItem keywords={generalSearchKeywords.metadata} navid='metadata' title="Meta data" onClick={handleSectionClick} />
                    <SettingNavItem keywords={generalSearchKeywords.twitter} navid='twitter' title="Twitter card" onClick={handleSectionClick} />
                    <SettingNavItem keywords={generalSearchKeywords.facebook} navid='facebook' title="Facebook card" onClick={handleSectionClick} />
                    <SettingNavItem keywords={generalSearchKeywords.socialAccounts} navid='social-accounts' title="Social accounts" onClick={handleSectionClick} />
                    <SettingNavItem keywords={generalSearchKeywords.lockSite} navid='locksite' title="Make this site private" onClick={handleSectionClick} />
                    <SettingNavItem keywords={generalSearchKeywords.users} navid='users' title="Staff" onClick={handleSectionClick} />
                </SettingNavSection>

                <SettingNavSection keywords={Object.values(siteSearchKeywords).flat()} title="Site">
                    <SettingNavItem keywords={siteSearchKeywords.design} navid='design' title="Branding and design" onClick={handleSectionClick} />
                    <SettingNavItem keywords={siteSearchKeywords.navigation} navid='navigation' title="Navigation" onClick={handleSectionClick} />
                    <SettingNavItem keywords={siteSearchKeywords.announcementBar} navid='announcement-bar' title="Announcement bar" onClick={handleSectionClick} />
                </SettingNavSection>

                <SettingNavSection keywords={Object.values(membershipSearchKeywords).flat()} title="Membership">
                    <SettingNavItem keywords={membershipSearchKeywords.portal} navid='portal' title="Portal" onClick={handleSectionClick} />
                    <SettingNavItem keywords={membershipSearchKeywords.access} navid='access' title="Access" onClick={handleSectionClick} />
                    <SettingNavItem keywords={membershipSearchKeywords.tiers} navid='tiers' title="Tiers" onClick={handleSectionClick} />
                    {hasTipsAndDonations && <SettingNavItem keywords={membershipSearchKeywords.tips} navid='tips-or-donations' title="Tips or donations" onClick={handleSectionClick} />}
                    <SettingNavItem keywords={membershipSearchKeywords.embedSignupForm} navid='embed-signup-form' title="Embeddable signup form" onClick={handleSectionClick} />
                    {hasRecommendations && <SettingNavItem keywords={membershipSearchKeywords.recommendations} navid='recommendations' title="Recommendations" onClick={handleSectionClick} />}
                    <SettingNavItem keywords={membershipSearchKeywords.analytics} navid='analytics' title="Analytics" onClick={handleSectionClick} />
                </SettingNavSection>

                <SettingNavSection keywords={Object.values(emailSearchKeywords).flat()} title="Email newsletter">
                    <SettingNavItem keywords={emailSearchKeywords.enableNewsletters} navid='enable-newsletters' title="Newsletter sending" onClick={handleSectionClick} />
                    {newslettersEnabled !== 'disabled' && (
                        <>
                            <SettingNavItem keywords={emailSearchKeywords.newsletters} navid='newsletters' title="Newsletters" onClick={handleSectionClick} />
                            <SettingNavItem keywords={emailSearchKeywords.defaultRecipients} navid='default-recipients' title="Default recipients" onClick={handleSectionClick} />
                            {!config.mailgunIsConfigured && <SettingNavItem keywords={emailSearchKeywords.mailgun} navid='mailgun' title="Mailgun settings" onClick={handleSectionClick} />}
                        </>
                    )}
                </SettingNavSection>

                <SettingNavSection keywords={Object.values(advancedSearchKeywords).flat()} title="Advanced">
                    <SettingNavItem keywords={advancedSearchKeywords.integrations} navid='integrations' title="Integrations" onClick={handleSectionClick} />
                    <SettingNavItem keywords={advancedSearchKeywords.codeInjection} navid='code-injection' title="Code injection" onClick={handleSectionClick} />
                    <SettingNavItem keywords={advancedSearchKeywords.labs} navid='labs' title="Labs" onClick={handleSectionClick} />
                    <SettingNavItem keywords={advancedSearchKeywords.history} navid='history' title="History" onClick={handleSectionClick} />
                </SettingNavSection>
            </div>
        </div>
    );
};

export default Sidebar;
