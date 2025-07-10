import GhostLogo from '../assets/images/orb-pink.png';
import React, {useEffect, useRef} from 'react';
import clsx from 'clsx';
import useFeatureFlag from '../hooks/useFeatureFlag';
import {Button, Icon, SettingNavItem, SettingNavItemProps, SettingNavSection, TextField, useFocusContext} from '@tryghost/admin-x-design-system';

import {searchKeywords as advancedSearchKeywords} from './settings/advanced/AdvancedSettings';
import {searchKeywords5x as advancedSearchKeywords5x} from './settings/advanced/AdvancedSettings';

import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {searchKeywords as emailSearchKeywords} from './settings/email/EmailSettings';

import {searchKeywords as generalSearchKeywords} from './settings/general/GeneralSettings';
import {searchKeywords5x as generalSearchKeywords5x} from './settings/general/GeneralSettings';

import {searchKeywords as growthSearchKeywords} from './settings/growth/GrowthSettings';
import {searchKeywords5x as growthSearchKeywords5x} from './settings/growth/GrowthSettings';

import {searchKeywords as membershipSearchKeywords} from './settings/membership/MembershipSettings';
import {searchKeywords5x as membershipSearchKeywords5x} from './settings/membership/MembershipSettings';

import {searchKeywords as siteSearchKeywords} from './settings/site/SiteSettings';
import {useGlobalData} from './providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useScrollSectionContext, useScrollSectionNav} from '../hooks/useScrollSection';
import {useSearch} from './providers/SettingsAppProvider';

const NavItem: React.FC<Omit<SettingNavItemProps, 'isVisible' | 'isCurrent' | 'navid'> & {keywords: string[]; navid: string | string[]}> = ({keywords, navid, ...props}) => {
    const {ref, props: scrollProps} = useScrollSectionNav(navid);
    const {currentSection} = useScrollSectionContext();
    const {checkVisible} = useSearch();

    // Convert navid to array if it's a string
    const navids = Array.isArray(navid) ? navid : [navid];

    // Check if any of the navids match the current section
    const isCurrent = navids.includes(currentSection || '');

    return <SettingNavItem
        ref={ref}
        isCurrent={isCurrent}
        isVisible={checkVisible(keywords)}
        navid={Array.isArray(navid) ? navid[0] : navid} // Use first navid for backward compatibility
        {...scrollProps}
        {...props}
    />;
};

const Sidebar: React.FC = () => {
    const {filter, setFilter, checkVisible, noResult, setNoResult} = useSearch();
    const {updateRoute} = useRouting();
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const {isAnyTextFieldFocused} = useFocusContext();
    const ui60 = useFeatureFlag('ui60');

    // Focus in on search field when pressing "/"
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // ensures it doesn't fire when typing in a text field, particularly useful for the Koenig Editor.
            if (e.target instanceof HTMLElement &&
                (e.target.nodeName === 'INPUT' || e.target.nodeName === 'TEXTAREA' || e.target.isContentEditable)) {
                return;
            }
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

    useEffect(() => {
        if (ui60) {
            if (!checkVisible(Object.values(generalSearchKeywords).flat()) &&
                !checkVisible(Object.values(siteSearchKeywords).flat()) &&
                !checkVisible(Object.values(membershipSearchKeywords).flat()) &&
                !checkVisible(Object.values(growthSearchKeywords).flat()) &&
                !checkVisible(Object.values(emailSearchKeywords).flat()) &&
                !checkVisible(Object.values(advancedSearchKeywords).flat())) {
                setNoResult(true);
            } else {
                setNoResult(false);
            }
        } else {
            if (!checkVisible(Object.values(generalSearchKeywords5x).flat()) &&
                !checkVisible(Object.values(siteSearchKeywords).flat()) &&
                !checkVisible(Object.values(membershipSearchKeywords5x).flat()) &&
                !checkVisible(Object.values(growthSearchKeywords5x).flat()) &&
                !checkVisible(Object.values(emailSearchKeywords).flat()) &&
                !checkVisible(Object.values(advancedSearchKeywords).flat())) {
                setNoResult(true);
            } else {
                setNoResult(false);
            }
        }
    }, [checkVisible, ui60, setNoResult, filter]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && filter) {
                // Blur the field
                searchInputRef.current?.blur();

                // Prevent the event from bubbling up to the window level
                event.stopPropagation();
            }
        };

        // Add the event listener to the searchInputRef field
        searchInputRef.current?.addEventListener('keydown', handleKeyDown);

        // Clean up the event listener when the component unmounts
        return () => {
            searchInputRef.current?.removeEventListener('keydown', handleKeyDown);
        };
    }, [filter]);

    const {settings, config} = useGlobalData();
    const [hasTipsAndDonations] = getSettingValues(settings, ['donations_enabled']) as [string];
    const [newslettersEnabled] = getSettingValues(settings, ['editor_default_email_recipients']) as [string];
    const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});

    const handleSectionClick = (e?: React.MouseEvent<HTMLAnchorElement>) => {
        if (e) {
            setFilter('');
            setNoResult(false);
            updateRoute(e.currentTarget.id);
        }
    };

    const updateSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(e.target.value);

        if (e.target.value) {
            document.querySelector('.admin-x-settings')?.scrollTo({top: 0, left: 0});
        }
    };

    const navClasses = clsx(
        'hidden pt-10 tablet:!visible tablet:!block'
    );

    return (
        <div className='ml-auto flex w-full flex-col pt-0 tablet:max-w-[240px]' data-testid="sidebar">
            <div className='sticky top-0 flex content-stretch items-end tablet:h-20 tablet:bg-grey-50 xl:h-20 dark:bg-grey-975 dark:tablet:bg-[#101114]'>
                <div className='relative w-full'>
                    <Icon className='absolute left-3 top-3 z-10' colorClass='text-grey-500' name='magnifying-glass' size='sm' />
                    <TextField
                        autoComplete="off"
                        className='mr-12 flex h-10 w-full items-center rounded-lg border border-transparent bg-white px-[33px] py-1.5 text-[14px] shadow-[0_0_1px_rgba(21,23,26,0.25),0_1px_3px_rgba(0,0,0,0.03),0_8px_10px_-12px_rgba(0,0,0,.1)] transition-colors hover:shadow-sm focus:border-green focus:bg-white focus:shadow-[0_0_0_2px_rgba(48,207,67,0.25)] focus:outline-2 tablet:mr-0 dark:border-transparent dark:bg-grey-925 dark:text-white dark:placeholder:text-grey-800 dark:focus:border-green dark:focus:bg-grey-950'
                        containerClassName='w-100'
                        inputRef={searchInputRef}
                        placeholder="Search settings"
                        title="Search"
                        value={filter}
                        clearBg
                        hideTitle
                        unstyled
                        onChange={updateSearch}
                    />
                    {filter ? <Button className='absolute right-14 top-3 p-1 tablet:right-3' icon='close' iconColorClass='text-grey-700 !w-[10px] !h-[10px]' size='sm' unstyled onClick={() => {
                        setFilter('');
                        searchInputRef.current?.focus();
                    }} /> : <div className='absolute -right-1/2 top-[9px] hidden rounded border border-grey-400 bg-white px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-grey-600 shadow-[0px_1px_#CED4D9] tablet:!visible tablet:right-3 tablet:!block dark:border-grey-800 dark:bg-grey-900 dark:text-grey-500 dark:shadow-[0px_1px_#626D79]'>/</div>}
                </div>
            </div>
            <nav className={navClasses} id='admin-x-settings-sidebar'>
                {noResult &&
                <div className='ml-2 text-base text-grey-700'>
                    <h2 className='mb-2 text-base font-semibold tracking-normal text-black dark:text-white'>No result</h2>
                    <div>
                        {`We couldn't find any setting matching '${filter}'`}.
                    </div>
                </div>
                }

                {/* General settings */}
                {ui60 ?
                    <SettingNavSection isVisible={checkVisible(Object.values(generalSearchKeywords).flat())} title="General settings">
                        <NavItem icon='textfield' keywords={generalSearchKeywords.titleAndDescription} navid='general' title="Title & description" onClick={handleSectionClick} />
                        <NavItem icon='world-clock' keywords={generalSearchKeywords.timeZone} navid='timezone' title="Timezone" onClick={handleSectionClick} />
                        <NavItem icon='language' keywords={generalSearchKeywords.publicationLanguage} navid='publication-language' title="Publication language" onClick={handleSectionClick} />
                        <NavItem icon='user-pen' keywords={generalSearchKeywords.users} navid='staff' title="Staff" onClick={handleSectionClick} />
                        <NavItem icon='layer' keywords={generalSearchKeywords.metadata} navid='metadata' title="Meta data" onClick={handleSectionClick} />
                        <NavItem icon='like' keywords={generalSearchKeywords.socialAccounts} navid='social-accounts' title="Social accounts" onClick={handleSectionClick} />
                        <NavItem icon='baseline-chart' keywords={generalSearchKeywords.analytics} navid='analytics' title="Analytics" onClick={handleSectionClick} />
                        <NavItem icon='lock-locked' keywords={generalSearchKeywords.lockSite} navid='locksite' title="Make this site private" onClick={handleSectionClick} />
                    </SettingNavSection>
                    :
                    <SettingNavSection isVisible={checkVisible(Object.values(generalSearchKeywords).flat())} title="General settings">
                        <NavItem icon='textfield' keywords={generalSearchKeywords5x.titleAndDescription} navid='general' title="Title & description" onClick={handleSectionClick} />
                        <NavItem icon='world-clock' keywords={generalSearchKeywords5x.timeZone} navid='timezone' title="Timezone" onClick={handleSectionClick} />
                        <NavItem icon='language' keywords={generalSearchKeywords5x.publicationLanguage} navid='publication-language' title="Publication language" onClick={handleSectionClick} />
                        <NavItem icon='layer' keywords={generalSearchKeywords5x.metadata} navid='metadata' title="Meta data" onClick={handleSectionClick} />
                        <NavItem icon='twitter-x' keywords={generalSearchKeywords5x.twitter} navid='twitter' title="X card" onClick={handleSectionClick} />
                        <NavItem icon='facebook' keywords={generalSearchKeywords5x.facebook} navid='facebook' title="Facebook card" onClick={handleSectionClick} />
                        <NavItem icon='like' keywords={generalSearchKeywords5x.socialAccounts} navid='social-accounts' title="Social accounts" onClick={handleSectionClick} />
                        <NavItem icon='lock-locked' keywords={generalSearchKeywords5x.lockSite} navid='locksite' title="Make this site private" onClick={handleSectionClick} />
                        <NavItem icon='user-page' keywords={generalSearchKeywords5x.users} navid='staff' title="Staff" onClick={handleSectionClick} />
                    </SettingNavSection>
                }

                {/* Site settings */}
                <SettingNavSection isVisible={checkVisible(Object.values(siteSearchKeywords).flat())} title="Site">
                    <NavItem icon='palette' keywords={siteSearchKeywords.design} navid='design' title="Design & branding" onClick={handleSectionClick} />
                    <NavItem icon='layout-2-col' keywords={siteSearchKeywords.theme} navid='theme' title="Theme" onClick={handleSectionClick} />
                    <NavItem icon='navigation' keywords={siteSearchKeywords.navigation} navid='navigation' title="Navigation" onClick={handleSectionClick} />
                    <NavItem icon='megaphone' keywords={siteSearchKeywords.announcementBar} navid='announcement-bar' title="Announcement bar" onClick={handleSectionClick} />
                </SettingNavSection>

                {/* Membership settings */}
                {ui60 ?
                    <SettingNavSection isVisible={checkVisible([...Object.values(membershipSearchKeywords).flat(), ...emailSearchKeywords.newslettersNavMenu])} title="Membership">
                        <NavItem icon='key' keywords={membershipSearchKeywords.access} navid={['members', 'spam-filters']} title="Access" onClick={handleSectionClick} />
                        <NavItem icon='bills' keywords={membershipSearchKeywords.tiers} navid='tiers' title="Tiers" onClick={handleSectionClick} />
                        <NavItem icon='portal' keywords={membershipSearchKeywords.portal} navid='portal' title="Signup portal" onClick={handleSectionClick} />
                        {hasTipsAndDonations && hasStripeEnabled && <NavItem icon='piggybank' keywords={membershipSearchKeywords.tips} navid='tips-and-donations' title="Tips & donations" onClick={handleSectionClick} />}
                        <NavItem icon='email' keywords={emailSearchKeywords.newslettersNavMenu} navid={['enable-newsletters', 'default-recipients', 'newsletters', 'mailgun']} title="Newsletters" onClick={handleSectionClick} />
                    </SettingNavSection>
                    :
                    <SettingNavSection isVisible={checkVisible(Object.values(membershipSearchKeywords5x).flat())} title="Membership">
                        <NavItem icon='portal' keywords={membershipSearchKeywords5x.portal} navid='portal' title="Portal settings" onClick={handleSectionClick} />
                        <NavItem icon='key' keywords={membershipSearchKeywords5x.access} navid='members' title="Access" onClick={handleSectionClick} />
                        <NavItem icon='bills' keywords={membershipSearchKeywords5x.tiers} navid='tiers' title="Tiers" onClick={handleSectionClick} />
                        <NavItem icon='baseline-chart' keywords={membershipSearchKeywords5x.analytics} navid='analytics' title="Analytics" onClick={handleSectionClick} />
                    </SettingNavSection>
                }

                {/* Growth */}

                {ui60 ?
                    <SettingNavSection isVisible={checkVisible(Object.values(growthSearchKeywords).flat())} title="Growth">
                        <NavItem icon='heart' keywords={growthSearchKeywords.recommendations} navid='recommendations' title="Recommendations" onClick={handleSectionClick} />
                        <NavItem icon='emailfield' keywords={growthSearchKeywords.embedSignupForm} navid='embed-signup-form' title="Signup forms" onClick={handleSectionClick} />
                        {hasStripeEnabled && <NavItem icon='discount' keywords={growthSearchKeywords.offers} navid='offers' title="Offers" onClick={handleSectionClick} />}
                    </SettingNavSection>
                    :
                    <SettingNavSection isVisible={checkVisible(Object.values(growthSearchKeywords5x).flat())} title="Growth">
                        <NavItem icon='heart' keywords={growthSearchKeywords5x.recommendations} navid='recommendations' title="Recommendations" onClick={handleSectionClick} />
                        <NavItem icon='emailfield' keywords={growthSearchKeywords5x.embedSignupForm} navid='embed-signup-form' title="Embeddable signup form" onClick={handleSectionClick} />
                        {hasStripeEnabled && <NavItem icon='discount' keywords={growthSearchKeywords5x.offers} navid='offers' title="Offers" onClick={handleSectionClick} />}
                        {hasTipsAndDonations && hasStripeEnabled && <NavItem icon='piggybank' keywords={growthSearchKeywords5x.tips} navid='tips-and-donations' title="Tips & donations" onClick={handleSectionClick} />}
                    </SettingNavSection>
                }

                {!ui60 &&
                <SettingNavSection isVisible={checkVisible(Object.values(emailSearchKeywords).flat())} title="Email newsletter">
                    <NavItem icon='email-check' keywords={emailSearchKeywords.enableNewsletters} navid='enable-newsletters' title="Newsletter sending" onClick={handleSectionClick} />
                    {newslettersEnabled !== 'disabled' && (
                        <>
                            <NavItem icon='recepients' keywords={emailSearchKeywords.defaultRecipients} navid='default-recipients' title="Default recipients" onClick={handleSectionClick} />
                            <NavItem icon='email' keywords={emailSearchKeywords.newsletters} navid='newsletters' title="Newsletters" onClick={handleSectionClick} />
                            {!config.mailgunIsConfigured && <NavItem icon='at-sign' keywords={emailSearchKeywords.mailgun} navid='mailgun' title="Mailgun settings" onClick={handleSectionClick} />}
                        </>
                    )}
                </SettingNavSection>
                }

                {ui60 ?
                    <SettingNavSection isVisible={checkVisible(Object.values(advancedSearchKeywords).flat())} title="Advanced">
                        <NavItem icon='modules-3' keywords={advancedSearchKeywords.integrations} navid='integrations' title="Integrations" onClick={handleSectionClick} />
                        <NavItem icon='download' keywords={advancedSearchKeywords.migrationtools} navid='migration' title="Import/Export" onClick={handleSectionClick} />
                        <NavItem icon='brackets' keywords={advancedSearchKeywords.codeInjection} navid='code-injection' title="Code injection" onClick={handleSectionClick} />
                        <NavItem icon='labs-flask' keywords={advancedSearchKeywords.labs} navid='labs' title="Labs" onClick={handleSectionClick} />
                        <NavItem icon='time-back' keywords={advancedSearchKeywords.history} navid='history' title="History" onClick={handleSectionClick} />
                    </SettingNavSection>
                    :
                    <SettingNavSection isVisible={checkVisible(Object.values(advancedSearchKeywords5x).flat())} title="Advanced">
                        <NavItem icon='modules-3' keywords={advancedSearchKeywords5x.integrations} navid='integrations' title="Integrations" onClick={handleSectionClick} />
                        <NavItem icon='download' keywords={advancedSearchKeywords5x.migrationtools} navid='migration' title="Import/Export" onClick={handleSectionClick} />
                        {!ui60 &&
                        <NavItem icon='block' keywords={advancedSearchKeywords5x.spamFilters} navid='spam-filters' title="Spam filters" onClick={handleSectionClick} />
                        }
                        <NavItem icon='brackets' keywords={advancedSearchKeywords5x.codeInjection} navid='code-injection' title="Code injection" onClick={handleSectionClick} />
                        <NavItem icon='labs-flask' keywords={advancedSearchKeywords5x.labs} navid='labs' title="Labs" onClick={handleSectionClick} />
                        <NavItem icon='time-back' keywords={advancedSearchKeywords5x.history} navid='history' title="History" onClick={handleSectionClick} />
                    </SettingNavSection>
                }

                {!filter &&
                <a className='w-100 mb-10 mt-1 flex h-[38px] cursor-pointer items-center rounded-lg px-3 py-2 text-left text-[14px] font-medium text-grey-800 transition-all hover:bg-grey-200 focus:bg-grey-100 dark:text-grey-600 dark:hover:bg-grey-950 dark:focus:bg-grey-925' onClick={() => {
                    updateRoute('about');
                }}>
                    <img alt='Ghost Logo' className='mr-[7px] size-[18px]' src={GhostLogo} />
                    About Ghost
                </a>
                }
            </nav>
        </div>
    );
};

export default Sidebar;
