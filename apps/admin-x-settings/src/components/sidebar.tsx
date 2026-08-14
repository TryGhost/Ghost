import GhostLogo from '../assets/images/orb-pink.png';
import React, {useEffect, useRef} from 'react';
import clsx from 'clsx';
import {Badge, InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, Kbd} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {Search, X} from 'lucide-react';
import {SettingNavItem, type SettingNavItemProps, SettingNavSection} from '@tryghost/admin-x-design-system';
import {useFocusContext} from '@tryghost/shade/app';

import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';

import {searchKeywords as advancedSearchKeywords} from './settings/advanced/advanced-settings';
import {searchKeywords as emailSearchKeywords} from './settings/email/email-settings';
import {searchKeywords as emailsSearchKeywords} from './settings/email/emails';
import {searchKeywords as generalSearchKeywords} from './settings/general/general-settings';
import {searchKeywords as growthSearchKeywords} from './settings/growth/growth-settings';
import {searchKeywords as membershipSearchKeywords} from './settings/membership/membership-settings';
import {searchKeywords as siteSearchKeywords} from './settings/site/site-settings';

import useFeatureFlag from '../hooks/use-feature-flag';
import {useGlobalData} from './providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useScrollSectionContext, useScrollSectionNav} from '../hooks/use-scroll-section';
import {useSearch} from './providers/settings-app-provider';

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

const PrivateBadge: React.FC = () => (
    <Badge className="gap-1 border-transparent bg-orange-100 px-1.5 py-0 text-[11px] leading-5 font-semibold text-orange-700 shadow-[0_0_0_1px_rgba(255,255,255,0.55)] dark:bg-orange-500/20 dark:text-orange-300 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]" variant="secondary">
        <LucideIcon.Lock className="size-3" strokeWidth={2.25} />
        Private
    </Badge>
);

const Sidebar: React.FC = () => {
    const {filter, setFilter, checkVisible, noResult, setNoResult} = useSearch();
    const {updateRoute} = useRouting();
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const {isAnyTextFieldFocused} = useFocusContext();
    const {settings, config} = useGlobalData();
    const [hasTipsAndDonations, isPrivate, paidMembersEnabled, newslettersEnabled] = getSettingValues(settings, ['donations_enabled', 'is_private', 'paid_members_enabled', 'editor_default_email_recipients']) as [boolean, boolean, boolean, string];
    const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});
    const hasAutomations = useFeatureFlag('automations');
    const hasCustomFields = useFeatureFlag('membersCustomFields');
    const hasNewslettersEnabled = newslettersEnabled !== 'disabled';
    const mailgunIsConfigured = Boolean(config.mailgunIsConfigured);
    const hasMailgun = hasNewslettersEnabled && !mailgunIsConfigured;
    const visibleMembershipSearchKeywords = React.useMemo(() => [
        membershipSearchKeywords.access,
        membershipSearchKeywords.tiers,
        membershipSearchKeywords.portal,
        ...(paidMembersEnabled ? [membershipSearchKeywords.giftSubscriptions] : []),
        ...(hasAutomations ? [] : [membershipSearchKeywords.memberEmails]),
        ...(hasTipsAndDonations && hasStripeEnabled ? [membershipSearchKeywords.tips] : []),
        ...(hasCustomFields ? [membershipSearchKeywords.customFields] : [])
    ].flat(), [hasStripeEnabled, hasTipsAndDonations, paidMembersEnabled, hasAutomations, hasCustomFields]);
    const visibleEmailSearchKeywords = React.useMemo(() => {
        const keywords = hasAutomations ? emailsSearchKeywords : emailSearchKeywords;
        return [
            keywords.enableNewsletters,
            ...(hasNewslettersEnabled ? [keywords.defaultRecipients] : []),
            ...(hasAutomations ? [emailsSearchKeywords.emails] : (hasNewslettersEnabled ? [emailSearchKeywords.newsletters] : [])),
            ...(hasMailgun ? [keywords.mailgun] : [])
        ].flat();
    }, [hasAutomations, hasNewslettersEnabled, hasMailgun]);
    const visibleGrowthSearchKeywords = React.useMemo(() => [
        growthSearchKeywords.network,
        growthSearchKeywords.explore,
        growthSearchKeywords.recommendations,
        growthSearchKeywords.embedSignupForm,
        ...(hasStripeEnabled ? [growthSearchKeywords.offers] : [])
    ].flat(), [hasStripeEnabled]);

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
        if (!checkVisible(Object.values(generalSearchKeywords).flat()) &&
            !checkVisible(Object.values(siteSearchKeywords).flat()) &&
            !checkVisible([...visibleMembershipSearchKeywords, ...visibleEmailSearchKeywords]) &&
            !checkVisible(visibleGrowthSearchKeywords) &&
            !checkVisible(Object.values(advancedSearchKeywords).flat())) {
            setNoResult(true);
        } else {
            setNoResult(false);
        }
    }, [checkVisible, setNoResult, filter, visibleEmailSearchKeywords, visibleMembershipSearchKeywords, visibleGrowthSearchKeywords]);

    useEffect(() => {
        const searchInput = searchInputRef.current;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && filter) {
                // Blur the field
                searchInputRef.current?.blur();

                // Prevent the event from bubbling up to the window level
                event.stopPropagation();
            }
        };

        // Add the event listener to the searchInputRef field
        searchInput?.addEventListener('keydown', handleKeyDown);

        // Clean up the event listener when the component unmounts
        return () => {
            searchInput?.removeEventListener('keydown', handleKeyDown);
        };
    }, [filter]);

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
        'hidden pt-10 tablet:visible! tablet:block!'
    );

    return (
        <div className='ml-auto flex w-full flex-col pt-0 tablet:max-w-[240px]' data-testid="sidebar">
            <div className='sticky top-0 flex content-stretch items-end tablet:h-20 tablet:bg-grey-50 xl:h-20 dark:bg-grey-950 dark:tablet:bg-[#101114]'>
                <InputGroup className='mr-8 rounded-full border-control-border bg-surface-elevated-2 shadow-sm has-[[data-slot=input-group-control]:focus-visible]:border-green! has-[[data-slot=input-group-control]:focus-visible]:bg-surface-elevated-2! has-[[data-slot=input-group-control]:focus-visible]:ring-green/25! tablet:mr-0'>
                    <InputGroupAddon align='inline-start'>
                        <Search aria-hidden='true' className='size-4' />
                    </InputGroupAddon>
                    <InputGroupInput
                        ref={searchInputRef}
                        aria-label='Search settings'
                        autoComplete="off"
                        autoCorrect="off"
                        placeholder="Search settings"
                        value={filter}
                        onChange={updateSearch}
                    />
                    <InputGroupAddon align='inline-end'>
                        {filter ? (
                            <InputGroupButton aria-label='Clear query' size='icon-xs' onClick={() => {
                                setFilter('');
                                searchInputRef.current?.focus();
                            }}>
                                <X aria-hidden='true' />
                            </InputGroupButton>
                        ) : <Kbd className='hidden tablet:inline-flex'>/</Kbd>}
                    </InputGroupAddon>
                </InputGroup>
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
                <SettingNavSection isVisible={checkVisible(Object.values(generalSearchKeywords).flat())} title="General settings">
                    <NavItem icon={<LucideIcon.TextCursorInput />} keywords={generalSearchKeywords.titleAndDescription} navid='general' title="Title & description" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.Clock4 />} keywords={generalSearchKeywords.timeZone} navid='timezone' title="Timezone" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.Languages />} keywords={generalSearchKeywords.publicationLanguage} navid='publication-language' title="Publication language" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.UserPen />} keywords={generalSearchKeywords.users} navid='staff' title="Staff" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.Layers />} keywords={generalSearchKeywords.metadata} navid='metadata' title="Meta data" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.ThumbsUp />} keywords={generalSearchKeywords.socialAccounts} navid='social-accounts' title="Social accounts" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.TrendingUp />} keywords={generalSearchKeywords.analytics} navid='analytics' title="Analytics" onClick={handleSectionClick} />
                </SettingNavSection>

                {/* Site settings */}
                <SettingNavSection isVisible={checkVisible(Object.values(siteSearchKeywords).flat())} title="Site">
                    <NavItem icon={<LucideIcon.SwatchBook />} keywords={siteSearchKeywords.design} navid='design' title="Design & branding" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.PanelsTopLeft />} keywords={siteSearchKeywords.theme} navid='theme' title="Theme" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.SquareMenu />} keywords={siteSearchKeywords.navigation} navid='navigation' title="Navigation" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.Megaphone />} keywords={siteSearchKeywords.announcementBar} navid='announcement-bar' title="Announcement bar" onClick={handleSectionClick} />
                </SettingNavSection>

                {/* Membership settings */}
                <SettingNavSection isVisible={checkVisible([...visibleMembershipSearchKeywords, ...visibleEmailSearchKeywords])} title="Membership">
                    <NavItem
                        icon={<LucideIcon.KeyRound />}
                        keywords={membershipSearchKeywords.access}
                        navid={['members', 'spam-filters']}
                        title={(
                            <span className='flex min-w-0 flex-1 items-center justify-between gap-2'>
                                <span className='min-w-0 truncate'>Access</span>
                                {isPrivate && <PrivateBadge />}
                            </span>
                        )}
                        onClick={handleSectionClick}
                    />
                    <NavItem icon={<LucideIcon.Banknote />} keywords={membershipSearchKeywords.tiers} navid='tiers' title="Tiers" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.SquareUserRound />} keywords={membershipSearchKeywords.portal} navid='portal' title="Signup portal" onClick={handleSectionClick} />
                    {paidMembersEnabled && <NavItem icon={<LucideIcon.Gift />} keywords={membershipSearchKeywords.giftSubscriptions} navid='gift-subscriptions' title="Gift subscriptions" onClick={handleSectionClick} />}
                    {!hasAutomations && <NavItem icon={<LucideIcon.MailPlus />} keywords={membershipSearchKeywords.memberEmails} navid='memberemails' title="Welcome emails" onClick={handleSectionClick} />}
                    {hasTipsAndDonations && hasStripeEnabled && <NavItem icon={<LucideIcon.PiggyBank />} keywords={membershipSearchKeywords.tips} navid='tips-and-donations' title="Tips & donations" onClick={handleSectionClick} />}
                    {hasCustomFields && <NavItem icon={<LucideIcon.TextCursorInput />} keywords={membershipSearchKeywords.customFields} navid='custom-fields' title="Custom fields" onClick={handleSectionClick} />}
                    {hasAutomations
                        ? <NavItem icon={<LucideIcon.Mail />} keywords={visibleEmailSearchKeywords} navid={['enable-newsletters', 'default-recipients', 'emails', 'mailgun']} title="Email" onClick={handleSectionClick} />
                        : <NavItem icon={<LucideIcon.Mail />} keywords={visibleEmailSearchKeywords} navid={['enable-newsletters', 'default-recipients', 'newsletters', 'mailgun']} title="Newsletters" onClick={handleSectionClick} />
                    }
                </SettingNavSection>

                {/* Growth */}
                <SettingNavSection isVisible={checkVisible(visibleGrowthSearchKeywords)} title="Growth">
                    <NavItem icon={<LucideIcon.Waypoints />} keywords={growthSearchKeywords.network} navid='network' title="Network" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.Globe />} keywords={growthSearchKeywords.explore} navid='explore' title="Ghost Explore" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.Heart />} keywords={growthSearchKeywords.recommendations} navid='recommendations' title="Recommendations" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.ClipboardType />} keywords={growthSearchKeywords.embedSignupForm} navid='embed-signup-form' title="Signup forms" onClick={handleSectionClick} />
                    {hasStripeEnabled && <NavItem icon={<LucideIcon.Tag />} keywords={growthSearchKeywords.offers} navid='offers' title="Offers" onClick={handleSectionClick} />}
                </SettingNavSection>

                <SettingNavSection isVisible={checkVisible(Object.values(advancedSearchKeywords).flat())} title="Advanced">
                    <NavItem icon={<LucideIcon.Blocks />} keywords={advancedSearchKeywords.integrations} navid='integrations' title="Integrations" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.Download />} keywords={advancedSearchKeywords.migrationtools} navid='migration' title="Import/Export" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.Code />} keywords={advancedSearchKeywords.codeInjection} navid='code-injection' title="Code injection" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.FlaskConical />} keywords={advancedSearchKeywords.labs} navid='labs' title="Labs" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.History />} keywords={advancedSearchKeywords.history} navid='history' title="History" onClick={handleSectionClick} />
                    <NavItem icon={<LucideIcon.TriangleAlert />} keywords={advancedSearchKeywords.dangerzone} navid='dangerzone' title="Danger zone" onClick={handleSectionClick} />
                </SettingNavSection>

                {!filter &&
                <a className='mt-1 mb-10 flex h-[38px] w-100 cursor-pointer items-center rounded-lg px-3 py-2 text-left text-[14px] font-medium text-grey-800 transition-all hover:bg-grey-200 focus:bg-grey-100 dark:text-grey-600 dark:hover:bg-grey-950 dark:focus:bg-grey-900' onClick={() => {
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
