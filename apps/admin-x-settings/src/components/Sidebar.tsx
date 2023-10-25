import Button from '../admin-x-ds/global/Button';
import GhostLogo from '../assets/images/orb-pink.png';
import Icon from '../admin-x-ds/global/Icon';
import React, {useEffect, useRef} from 'react';
import SettingNavItem from '../admin-x-ds/settings/SettingNavItem';
import SettingNavSection from '../admin-x-ds/settings/SettingNavSection';
import TextField from '../admin-x-ds/global/form/TextField';
import clsx from 'clsx';
import useFeatureFlag from '../hooks/useFeatureFlag';
import useRouting from '../hooks/useRouting';
import {searchKeywords as advancedSearchKeywords} from './settings/advanced/AdvancedSettings';
import {searchKeywords as emailSearchKeywords} from './settings/email/EmailSettings';
import {searchKeywords as generalSearchKeywords} from './settings/general/GeneralSettings';
import {getSettingValues} from '../api/settings';
import {searchKeywords as membershipSearchKeywords} from './settings/membership/MembershipSettings';
import {searchKeywords as siteSearchKeywords} from './settings/site/SiteSettings';
import {useFocusContext} from '../admin-x-ds/providers/DesignSystemProvider';
import {useGlobalData} from './providers/GlobalDataProvider';
import {useSearch} from './providers/ServiceProvider';

const Sidebar: React.FC = () => {
    const {filter, setFilter} = useSearch();
    const {updateRoute} = useRouting();
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const {isAnyTextFieldFocused} = useFocusContext();

    // Focus in on search field when pressing "/"
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === '/' && !isAnyTextFieldFocused) {
                e?.preventDefault();
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                }
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    });

    // Auto-focus on searchfield on page load
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    const {settings, config} = useGlobalData();
    const [newslettersEnabled] = getSettingValues(settings, ['editor_default_email_recipients']) as [string];

    const handleSectionClick = (e?: React.MouseEvent<HTMLAnchorElement>) => {
        if (e) {
            setFilter('');
            updateRoute(e.currentTarget.id);
        }
    };

    const hasTipsAndDonations = useFeatureFlag('tipsAndDonations');
    const hasRecommendations = useFeatureFlag('recommendations');

    const updateSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(e.target.value);

        if (e.target.value) {
            document.getElementById('admin-x-root')?.scrollTo({top: 0, left: 0});
        }
    };

    const navClasses = clsx(
        'no-scrollbar hidden pt-10 tablet:!visible tablet:!block tablet:h-[calc(100vh-8vmin-36px)] tablet:overflow-y-auto'
    );

    return (
        <div data-testid="sidebar">
            <div className='relative flex content-stretch items-end tablet:h-[36px]'>
                <Icon className='absolute left-2 top-[10px] z-10' colorClass='text-grey-500' name='magnifying-glass' size='sm' />
                <TextField autoComplete="off" className='-mx-1 flex h-9 w-[calc(100%+8px)] items-center rounded-full border border-transparent bg-grey-150 px-[33px] py-1.5 text-sm transition-all hover:bg-grey-100 focus:border-green focus:bg-white focus:shadow-[0_0_0_1px_rgba(48,207,67,1)] focus:outline-2 dark:bg-grey-900 dark:text-white dark:focus:bg-black' containerClassName='w-100' inputRef={searchInputRef} placeholder="Search settings" title="Search" value={filter} clearBg hideTitle unstyled onChange={updateSearch} />
                {filter ? <Button className='absolute right-3 top-[10px] p-1' icon='close' iconColorClass='text-grey-700 !w-[10px] !h-[10px]' size='sm' unstyled onClick={() => {
                    setFilter('');
                }} /> : <div className='absolute right-0 top-[20px] hidden rounded border border-grey-400 bg-white px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-grey-600 shadow-[0px_1px_#CED4D9] dark:bg-grey-800 dark:text-grey-500 tablet:!visible tablet:right-3 tablet:top-[7px] tablet:!block'>/</div>}
            </div>
            <div className={navClasses} id='admin-x-settings-sidebar'>
                <SettingNavSection keywords={Object.values(generalSearchKeywords).flat()} title="General settings">
                    <SettingNavItem icon='textfield' keywords={generalSearchKeywords.titleAndDescription} navid='general' title="Title & description" onClick={handleSectionClick} />
                    <SettingNavItem icon='world-clock' keywords={generalSearchKeywords.timeZone} navid='timezone' title="Timezone" onClick={handleSectionClick} />
                    <SettingNavItem icon='language' keywords={generalSearchKeywords.publicationLanguage} navid='publication-language' title="Publication language" onClick={handleSectionClick} />
                    <SettingNavItem icon='layer' keywords={generalSearchKeywords.metadata} navid='metadata' title="Meta data" onClick={handleSectionClick} />
                    <SettingNavItem icon='twitter-x' keywords={generalSearchKeywords.twitter} navid='twitter' title="X card" onClick={handleSectionClick} />
                    <SettingNavItem icon='facebook' keywords={generalSearchKeywords.facebook} navid='facebook' title="Facebook card" onClick={handleSectionClick} />
                    <SettingNavItem icon='like' keywords={generalSearchKeywords.socialAccounts} navid='social-accounts' title="Social accounts" onClick={handleSectionClick} />
                    <SettingNavItem icon='lock-locked' keywords={generalSearchKeywords.lockSite} navid='locksite' title="Make this site private" onClick={handleSectionClick} />
                    <SettingNavItem icon='user-page' keywords={generalSearchKeywords.users} navid='staff' title="Staff" onClick={handleSectionClick} />
                </SettingNavSection>

                <SettingNavSection keywords={Object.values(siteSearchKeywords).flat()} title="Site">
                    <SettingNavItem icon='palette' keywords={siteSearchKeywords.design} navid='design' title="Design & branding" onClick={handleSectionClick} />
                    <SettingNavItem icon='navigation' keywords={siteSearchKeywords.navigation} navid='navigation' title="Navigation" onClick={handleSectionClick} />
                    <SettingNavItem icon='megaphone' keywords={siteSearchKeywords.announcementBar} navid='announcement-bar' title="Announcement bar" onClick={handleSectionClick} />
                </SettingNavSection>

                <SettingNavSection keywords={Object.values(membershipSearchKeywords).flat()} title="Membership">
                    <SettingNavItem icon='key' keywords={membershipSearchKeywords.access} navid='members' title="Access" onClick={handleSectionClick} />
                    <SettingNavItem icon='portal' keywords={membershipSearchKeywords.portal} navid='portal' title="Portal" onClick={handleSectionClick} />
                    <SettingNavItem icon='bills' keywords={membershipSearchKeywords.tiers} navid='tiers' title="Tiers" onClick={handleSectionClick} />
                    {hasTipsAndDonations && <SettingNavItem icon='piggybank' keywords={membershipSearchKeywords.tips} navid='tips-or-donations' title="Tips or donations" onClick={handleSectionClick} />}
                    <SettingNavItem icon='emailfield' keywords={membershipSearchKeywords.embedSignupForm} navid='embed-signup-form' title="Embeddable signup form" onClick={handleSectionClick} />
                    {hasRecommendations && <SettingNavItem icon='heart' keywords={membershipSearchKeywords.recommendations} navid='recommendations' title="Recommendations" onClick={handleSectionClick} />}
                    <SettingNavItem icon='baseline-chart' keywords={membershipSearchKeywords.analytics} navid='analytics' title="Analytics" onClick={handleSectionClick} />
                </SettingNavSection>

                <SettingNavSection keywords={Object.values(emailSearchKeywords).flat()} title="Email newsletter">
                    <SettingNavItem icon='email-check' keywords={emailSearchKeywords.enableNewsletters} navid='enable-newsletters' title="Newsletter sending" onClick={handleSectionClick} />
                    {newslettersEnabled !== 'disabled' && (
                        <>
                            <SettingNavItem icon='recepients' keywords={emailSearchKeywords.defaultRecipients} navid='default-recipients' title="Default recipients" onClick={handleSectionClick} />
                            <SettingNavItem icon='email' keywords={emailSearchKeywords.newsletters} navid='newsletters' title="Newsletters" onClick={handleSectionClick} />
                            {!config.mailgunIsConfigured && <SettingNavItem icon='at-sign' keywords={emailSearchKeywords.mailgun} navid='mailgun' title="Mailgun settings" onClick={handleSectionClick} />}
                        </>
                    )}
                </SettingNavSection>

                <SettingNavSection keywords={Object.values(advancedSearchKeywords).flat()} title="Advanced">
                    <SettingNavItem icon='modules-3' keywords={advancedSearchKeywords.integrations} navid='integrations' title="Integrations" onClick={handleSectionClick} />
                    <SettingNavItem icon='brackets' keywords={advancedSearchKeywords.codeInjection} navid='code-injection' title="Code injection" onClick={handleSectionClick} />
                    <SettingNavItem icon='labs-flask' keywords={advancedSearchKeywords.labs} navid='labs' title="Labs" onClick={handleSectionClick} />
                    <SettingNavItem icon='time-back' keywords={advancedSearchKeywords.history} navid='history' title="History" onClick={handleSectionClick} />
                </SettingNavSection>

                {!filter &&
                <a className='mb-10 ml-1 flex cursor-pointer items-center gap-1.5 pl-1 text-sm !font-normal' onClick={() => {
                    updateRoute('about');
                }}>
                    <img alt='Ghost Logo' className='h-[18px] w-[18px]' src={GhostLogo} />
                    About Ghost
                </a>
                }
            </div>
        </div>
    );
};

export default Sidebar;
