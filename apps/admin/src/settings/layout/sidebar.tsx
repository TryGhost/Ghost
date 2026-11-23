import GhostLogo from '@/settings/assets/images/orb-pink.png';
import React, { useEffect, useRef, useState } from 'react';
import {
  Badge,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Kbd,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { useFocusContext } from '@tryghost/shade/app';

import { getSettingValues } from '@tryghost/admin-x-framework/api/settings';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

import { searchKeywords as advancedSearchKeywords } from '@/settings/advanced/search-keywords';
import { searchKeywords as generalSearchKeywords } from '@/settings/general/search-keywords';
import { searchKeywords as growthSearchKeywords } from '@/settings/growth/search-keywords';
import { searchKeywords as membershipSearchKeywords } from '@/settings/membership/search-keywords';
import { searchKeywords as siteSearchKeywords } from '@/settings/site/search-keywords';
import { SETTINGS_GROUPS, type SettingsGroupId, getSettingsGroup } from './settings-groups';

import { useGlobalData } from '@/settings/providers/global-data-context';
import { useSettingsSectionVisibility } from '@/settings/hooks/use-section-visibility';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';
import {
  useActiveSettingsGroup,
  useSettingsGroupItems,
  useSettingsGroupKeywords,
  useSettingsGroupedNav,
} from '@/settings/hooks/use-settings-groups';
import { useScrollSectionContext, useScrollSectionNav } from '@/settings/hooks/use-scroll-section';
import { useSearch } from '@/settings/providers/settings-app-context';
import ExitSettingsButton from '@/settings/components/exit-settings-button';
import { ADMIN7_NAV_ICON_CLASS_NAME } from '@/layout/app-sidebar/nav-icon-class';
import { NavGroup } from '@/layout/app-sidebar/nav-group';
import { AnimatedNavMenuCollapsibleMenu } from '@/layout/app-sidebar/nav-menu-item';
import { NavHelpItem } from '@/layout/app-sidebar/nav-help-item';
import { PrivateSiteBadge } from '@/shared/private-site-badge';

interface NavItemProps {
  icon?: React.ReactNode;
  keywords: string[];
  navid: string | string[];
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title: React.ReactNode;
}

interface NavGroupContextValue {
  activeGroup: SettingsGroupId;
  collapsedGroup: SettingsGroupId | null;
  /** True when the navigation shows one group of settings at a time. */
  grouped: boolean;
  onGroupClick: (group: SettingsGroupId) => void;
}

const NavGroupContext = React.createContext<NavGroupContextValue | null>(null);

const NavItem: React.FC<NavItemProps> = ({ icon, keywords, navid, onClick, title }) => {
  const { ref, props: scrollProps } = useScrollSectionNav(navid);
  const { currentSection } = useScrollSectionContext();
  const { checkVisible } = useSearch();
  const grouped = React.useContext(NavGroupContext)?.grouped;
  const admin7Design = useFeatureFlag('admin7Design');

  // Convert navid to array if it's a string
  const navids = Array.isArray(navid) ? navid : [navid];

  // Check if any of the navids match the current section
  const isCurrent = navids.includes(currentSection || '');

  if (grouped) {
    // Hidden on the row, so a search hides the whole row rather than leaving a gap
    return (
      <SidebarMenuItem
        ref={ref}
        className={cn(!checkVisible(keywords) && 'hidden')}
        data-nav-row
        {...scrollProps}
      >
        <SidebarMenuButton
          aria-current={isCurrent ? 'page' : undefined}
          className={cn(admin7Design && 'font-[425]')}
          id={Array.isArray(navid) ? navid[0] : navid}
          isActive={isCurrent}
          type="button"
          onClick={onClick}
        >
          {icon}
          {title}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem ref={ref} data-nav-row {...scrollProps}>
      <SidebarMenuButton
        aria-current={isCurrent ? 'page' : undefined}
        className={cn(!checkVisible(keywords) && 'hidden')}
        id={Array.isArray(navid) ? navid[0] : navid}
        isActive={isCurrent}
        type="button"
        onClick={onClick}
      >
        {icon}
        {title}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

interface NavSectionProps {
  children?: React.ReactNode;
  /** The group this section shows in the grouped navigation. */
  group?: SettingsGroupId;
  isVisible: boolean;
  title: string;
}

const NavSection: React.FC<NavSectionProps> = ({ children, group, isVisible, title }) => {
  const navGroup = React.useContext(NavGroupContext);
  const { filter } = useSearch();

  if (!isVisible) {
    return null;
  }

  if (navGroup?.grouped && group) {
    // While searching, every group with a match stays open
    const isActiveGroup = navGroup.activeGroup === group;
    const expanded = Boolean(filter) || (isActiveGroup && navGroup.collapsedGroup !== group);
    const menuId = `settings-nav-${group}`;

    // An eyebrow like the main navigation's "Apps ›", whose chevron turns down when open
    return (
      <NavGroup className={cn('p-0', expanded && 'pb-2')}>
        {/* Classes on the label, not the button, so they merge over its own colour */}
        <NavGroup.Label
          className={cn(
            'w-fit cursor-pointer gap-0.5 hover:text-sidebar-foreground',
            // Important, to win over the admin7 nav's group-label tone
            isActiveGroup && 'text-sidebar-foreground!',
          )}
          asChild
          data-nav-row
        >
          <button
            aria-controls={menuId}
            aria-expanded={expanded}
            type="button"
            onClick={() => navGroup.onGroupClick(group)}
          >
            {title}
            <LucideIcon.ChevronRight
              aria-hidden="true"
              className={cn(
                'size-3! transition-transform duration-200 motion-reduce:transition-none',
                expanded && 'rotate-90',
              )}
              strokeWidth={2}
            />
          </button>
        </NavGroup.Label>
        {children && (
          <AnimatedNavMenuCollapsibleMenu expanded={expanded} id={menuId}>
            <NavGroup.Menu>{children}</NavGroup.Menu>
          </AnimatedNavMenuCollapsibleMenu>
        )}
      </NavGroup>
    );
  }

  return (
    <>
      <Text
        as="h2"
        className="section-heading settings-heading mb-4 ml-2 tracking-normal"
        size="md"
        weight="semibold"
        data-nav-row
      >
        {title}
      </Text>
      {children && <SidebarMenu className="-mt-1 mb-7 gap-0">{children}</SidebarMenu>}
    </>
  );
};

const PrivateBadge: React.FC = () => (
  <Badge
    className="gap-1 border-transparent bg-orange-100 px-1.5 py-0 text-[11px] leading-5 font-semibold text-orange-700 shadow-[0_0_0_1px_rgba(255,255,255,0.55)] dark:bg-orange-500/20 dark:text-orange-300 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
    variant="secondary"
  >
    <LucideIcon.Lock className="size-3" strokeWidth={2.25} />
    Private
  </Badge>
);

/**
 * Keeps the search context's noResult in step with the filter. Whichever view
 * holds the search runs it: the nav, or the page on mobile where the nav sits
 * in a sheet that unmounts while closed.
 */
function useSearchResults() {
  const { filter, checkVisible, setNoResult } = useSearch();
  const groupKeywords = useSettingsGroupKeywords();

  useEffect(() => {
    setNoResult(!Object.values(groupKeywords).some((keywords) => checkVisible(keywords)));
  }, [checkVisible, setNoResult, filter, groupKeywords]);

  return groupKeywords;
}

/** The keywords of the membership and growth sections in the stacked navigation. */
function useStackedSectionKeywords() {
  const visibility = useSettingsSectionVisibility();

  return React.useMemo(
    () => ({
      membership: [
        membershipSearchKeywords.access,
        membershipSearchKeywords.tiers,
        membershipSearchKeywords.portal,
        ...(visibility.giftSubscriptions ? [membershipSearchKeywords.giftSubscriptions] : []),
        ...(visibility.welcomeEmails ? [membershipSearchKeywords.memberEmails] : []),
        ...(visibility.tipsAndDonations ? [membershipSearchKeywords.tips] : []),
        ...(visibility.customFields ? [membershipSearchKeywords.customFields] : []),
        visibility.emailKeywords,
      ].flat(),
      growth: [
        growthSearchKeywords.network,
        growthSearchKeywords.explore,
        growthSearchKeywords.recommendations,
        growthSearchKeywords.embedSignupForm,
        ...(visibility.offers ? [growthSearchKeywords.offers] : []),
      ].flat(),
    }),
    [visibility],
  );
}

const NoSearchResult: React.FC<{ className?: string }> = ({ className }) => {
  const { filter } = useSearch();

  return (
    <div className={cn('text-base text-muted-foreground', className)}>
      <h2 className="mb-2 text-base font-semibold tracking-normal text-foreground">No result</h2>
      <div>{`We couldn't find any setting matching '${filter}'`}.</div>
    </div>
  );
};

/** The search's no-result message, for the page when the nav isn't on screen. */
export const SettingsSearchStatus: React.FC<{ className?: string }> = ({ className }) => {
  const { noResult } = useSearch();
  useSearchResults();

  return noResult ? <NoSearchResult className={className} /> : null;
};

interface SettingsSearchInputProps {
  className?: string;
  inputRef?: React.MutableRefObject<HTMLInputElement | null>;
}

const SettingsSearchInput: React.FC<SettingsSearchInputProps> = ({
  className,
  inputRef: externalInputRef,
}) => {
  const { filter, setFilter } = useSearch();
  const ownInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = externalInputRef ?? ownInputRef;

  useEffect(() => {
    const searchInput = inputRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && filter) {
        // Blur the field
        inputRef.current?.blur();

        // Prevent the event from bubbling up to the window level
        event.stopPropagation();
      }
    };

    searchInput?.addEventListener('keydown', handleKeyDown);

    return () => {
      searchInput?.removeEventListener('keydown', handleKeyDown);
    };
  }, [filter, inputRef]);

  const updateSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);

    if (e.target.value) {
      document.getElementById('settings-scroller')?.scrollTo({ top: 0, left: 0 });
    }
  };

  return (
    <InputGroup
      className={cn(
        'rounded-full border-control-border bg-surface-elevated-2 shadow-sm',
        className,
      )}
    >
      <InputGroupAddon align="inline-start">
        <LucideIcon.Search aria-hidden="true" className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        aria-label="Search settings"
        autoComplete="off"
        autoCorrect="off"
        placeholder="Search settings"
        value={filter}
        onChange={updateSearch}
      />
      <InputGroupAddon align="inline-end">
        {filter ? (
          <InputGroupButton
            aria-label="Clear query"
            size="icon-xs"
            onClick={() => {
              setFilter('');
              inputRef.current?.focus();
            }}
          >
            <LucideIcon.X aria-hidden="true" />
          </InputGroupButton>
        ) : (
          <Kbd className="hidden tablet:inline-flex">/</Kbd>
        )}
      </InputGroupAddon>
    </InputGroup>
  );
};

interface SettingsHeaderProps {
  className?: string;
  inputRef?: React.MutableRefObject<HTMLInputElement | null>;
}

/** The back button and search row that leads the Settings navigation. */
export const SettingsHeader: React.FC<SettingsHeaderProps> = ({ className, inputRef }) => (
  <Inline align="center" className={className} gap="sm">
    <ExitSettingsButton />
    <SettingsSearchInput className="flex-1" inputRef={inputRef} />
  </Inline>
);

const FADE_HEIGHT = 48;

/**
 * Fades the scroller's foot while there's more below, over as much of it as
 * is left to scroll. A mask, so it fades to whatever is behind the sidebar
 * (the admin7Design sidebar is glass).
 */
function useScrollFade(scrollerRef: React.RefObject<HTMLElement>, enabled: boolean) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!enabled || !scroller) {
      return;
    }
    const update = () =>
      setRemaining(Math.max(0, scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight));
    const mutationObserver = new MutationObserver(update);
    const resizeObserver = new ResizeObserver(update);
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    mutationObserver.observe(scroller, { childList: true, subtree: true });
    resizeObserver.observe(scroller);
    return () => {
      scroller.removeEventListener('scroll', update);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [enabled, scrollerRef]);

  const fade = Math.min(FADE_HEIGHT, remaining);
  if (!enabled || fade <= 1) {
    return undefined;
  }
  const mask = `linear-gradient(to bottom, #000 calc(100% - ${fade}px), transparent)`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

const Sidebar: React.FC = () => {
  const { filter, setFilter, checkVisible, noResult, setNoResult } = useSearch();
  const { updateRoute } = useSettingsNavigation();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const scrollerRef = useRef<HTMLElement>(null);
  const { isAnyTextFieldFocused } = useFocusContext();
  const { settings } = useGlobalData();
  const [isPrivate] = getSettingValues(settings, ['is_private']) as [boolean];
  const visibility = useSettingsSectionVisibility();
  // With admin7Design, the navigation sits in the floating sidebar's glass
  const floatingSidebar = useFeatureFlag('admin7Design');
  // Admin 7 has Help in its top bar instead
  const showHelp = !floatingSidebar;
  const scrollFade = useScrollFade(scrollerRef, floatingSidebar);
  const groupKeywords = useSearchResults();
  const stackedKeywords = useStackedSectionKeywords();
  const groupItems = useSettingsGroupItems();
  const grouped = useSettingsGroupedNav();
  const activeGroup = useActiveSettingsGroup();
  const [collapsedGroup, setCollapsedGroup] = useState<SettingsGroupId | null>(null);
  const [previousActiveGroup, setPreviousActiveGroup] = useState(activeGroup);

  // A group opens again whenever it becomes the active one
  if (previousActiveGroup !== activeGroup) {
    setPreviousActiveGroup(activeGroup);
    setCollapsedGroup(null);
  }
  // Focus in on search field when pressing "/"
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // ensures it doesn't fire when typing in a text field, particularly useful for the Koenig Editor.
      if (
        e.target instanceof HTMLElement &&
        (e.target.nodeName === 'INPUT' ||
          e.target.nodeName === 'TEXTAREA' ||
          e.target.isContentEditable)
      ) {
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
    // Lazy content can mount the sidebar after a deep-linked modal has opened.
    // Keep focus in the modal instead of moving it to the background search.
    if (
      document.getElementById('modal-backdrop') ||
      document.querySelector(':is([role="dialog"], [role="alertdialog"])[data-state="open"]')
    ) {
      return;
    }

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleSectionClick = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      setFilter('');
      setNoResult(false);
      updateRoute(e.currentTarget.id);
    }
  };

  // The active group's eyebrow folds it away; any other eyebrow shows that group.
  // While searching, every group with a match is already open and showing, so an
  // eyebrow does nothing.
  const handleGroupClick = (group: SettingsGroupId) => {
    if (filter) {
      return;
    }
    if (group === activeGroup) {
      setCollapsedGroup((collapsed) => (collapsed === group ? null : group));
      return;
    }
    updateRoute(getSettingsGroup(group).path);
  };

  const accessTitle = (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <span className="min-w-0 truncate">Access</span>
      {isPrivate && (floatingSidebar ? <PrivateSiteBadge /> : <PrivateBadge />)}
    </span>
  );

  const aboutItem = (
    <SidebarMenuItem data-nav-row>
      <SidebarMenuButton
        type="button"
        onClick={() => {
          updateRoute('about');
        }}
      >
        {/* The orb PNG as a mask keeps its detail but takes the nav's text colour, so it
            follows light and dark mode like the other nav icons. */}
        <span
          aria-hidden="true"
          className="size-4 shrink-0 bg-current"
          data-slot="nav-icon"
          style={{
            maskImage: `url(${GhostLogo})`,
            maskPosition: 'center',
            maskRepeat: 'no-repeat',
            maskSize: 'contain',
          }}
        />
        About Ghost
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const navGroup: NavGroupContextValue = {
    activeGroup,
    collapsedGroup,
    grouped,
    onGroupClick: handleGroupClick,
  };

  return (
    <Stack className="min-h-0 flex-1" data-testid="sidebar" gap="none">
      {/* data-nav-row marks the rows that cascade in when the shell swaps to this nav. */}
      <Box
        className={cn('shrink-0 pb-2', floatingSidebar ? 'px-3' : 'bg-sidebar px-5')}
        data-nav-row
      >
        <SettingsHeader inputRef={searchInputRef} />
      </Box>
      <NavGroupContext.Provider value={navGroup}>
        <nav
          ref={scrollerRef}
          // pb-5 matches the sidebar's pt-5, so the last item rests as far from the
          // bottom edge as the search row sits from the top.
          className={cn(
            'min-h-0 flex-1 overflow-y-auto pt-4 [&>:last-child]:mb-0',
            grouped ? 'pb-2' : 'pb-5',
            floatingSidebar ? 'px-3' : 'px-5',
            floatingSidebar && ADMIN7_NAV_ICON_CLASS_NAME,
          )}
          id="settings-sidebar-scroller"
          style={scrollFade}
        >
          {noResult && <NoSearchResult className="ml-2" />}

          {grouped ? (
            SETTINGS_GROUPS.map((group) => (
              <NavSection
                key={group.id}
                group={group.id}
                isVisible={checkVisible(groupKeywords[group.id])}
                title={group.title}
              >
                {groupItems[group.id].map((item) => {
                  const Icon = item.icon;
                  const id = Array.isArray(item.navid) ? item.navid[0] : item.navid;

                  return (
                    <NavItem
                      key={id}
                      icon={<Icon />}
                      keywords={item.keywords}
                      navid={item.navid}
                      title={id === 'members' ? accessTitle : item.title}
                      onClick={handleSectionClick}
                    />
                  );
                })}
              </NavSection>
            ))
          ) : (
            <>
              {/* General settings */}
              <NavSection
                isVisible={checkVisible(Object.values(generalSearchKeywords).flat())}
                title="General settings"
              >
                <NavItem
                  icon={<LucideIcon.TextCursorInput />}
                  keywords={generalSearchKeywords.titleAndDescription}
                  navid="general"
                  title="Title & description"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.Clock4 />}
                  keywords={generalSearchKeywords.timeZone}
                  navid="timezone"
                  title="Timezone"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.Languages />}
                  keywords={generalSearchKeywords.publicationLanguage}
                  navid="publication-language"
                  title="Publication language"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.UserPen />}
                  keywords={generalSearchKeywords.users}
                  navid="staff"
                  title="Staff"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.Layers />}
                  keywords={generalSearchKeywords.metadata}
                  navid="metadata"
                  title="Meta data"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.ThumbsUp />}
                  keywords={generalSearchKeywords.socialAccounts}
                  navid="social-accounts"
                  title="Social accounts"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.TrendingUp />}
                  keywords={generalSearchKeywords.analytics}
                  navid="analytics"
                  title="Analytics"
                  onClick={handleSectionClick}
                />
              </NavSection>

              {/* Site settings */}
              <NavSection
                isVisible={checkVisible(Object.values(siteSearchKeywords).flat())}
                title="Site"
              >
                <NavItem
                  icon={<LucideIcon.SwatchBook />}
                  keywords={siteSearchKeywords.design}
                  navid="design"
                  title="Design & branding"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.PanelsTopLeft />}
                  keywords={siteSearchKeywords.theme}
                  navid="theme"
                  title="Theme"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.SquareMenu />}
                  keywords={siteSearchKeywords.navigation}
                  navid="navigation"
                  title="Navigation"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.Megaphone />}
                  keywords={siteSearchKeywords.announcementBar}
                  navid="announcement-bar"
                  title="Announcement bar"
                  onClick={handleSectionClick}
                />
              </NavSection>

              {/* Membership settings */}
              <NavSection isVisible={checkVisible(stackedKeywords.membership)} title="Membership">
                <NavItem
                  icon={<LucideIcon.KeyRound />}
                  keywords={membershipSearchKeywords.access}
                  navid={['members', 'spam-filters']}
                  title={accessTitle}
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.Banknote />}
                  keywords={membershipSearchKeywords.tiers}
                  navid="tiers"
                  title="Tiers"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.SquareUserRound />}
                  keywords={membershipSearchKeywords.portal}
                  navid="portal"
                  title="Signup portal"
                  onClick={handleSectionClick}
                />
                {visibility.giftSubscriptions && (
                  <NavItem
                    icon={<LucideIcon.Gift />}
                    keywords={membershipSearchKeywords.giftSubscriptions}
                    navid="gift-subscriptions"
                    title="Gift subscriptions"
                    onClick={handleSectionClick}
                  />
                )}
                {visibility.welcomeEmails && (
                  <NavItem
                    icon={<LucideIcon.MailPlus />}
                    keywords={membershipSearchKeywords.memberEmails}
                    navid="memberemails"
                    title="Welcome emails"
                    onClick={handleSectionClick}
                  />
                )}
                {visibility.tipsAndDonations && (
                  <NavItem
                    icon={<LucideIcon.PiggyBank />}
                    keywords={membershipSearchKeywords.tips}
                    navid="tips-and-donations"
                    title="Tips & donations"
                    onClick={handleSectionClick}
                  />
                )}
                {visibility.customFields && (
                  <NavItem
                    icon={<LucideIcon.TextCursorInput />}
                    keywords={membershipSearchKeywords.customFields}
                    navid="custom-fields"
                    title="Custom fields"
                    onClick={handleSectionClick}
                  />
                )}
                {visibility.hasAutomations ? (
                  <NavItem
                    icon={<LucideIcon.Mail />}
                    keywords={visibility.emailKeywords}
                    navid={['enable-newsletters', 'default-recipients', 'emails', 'mailgun']}
                    title="Email"
                    onClick={handleSectionClick}
                  />
                ) : (
                  <NavItem
                    icon={<LucideIcon.Mail />}
                    keywords={visibility.emailKeywords}
                    navid={['enable-newsletters', 'default-recipients', 'newsletters', 'mailgun']}
                    title="Newsletters"
                    onClick={handleSectionClick}
                  />
                )}
              </NavSection>

              {/* Growth */}
              <NavSection isVisible={checkVisible(stackedKeywords.growth)} title="Growth">
                <NavItem
                  icon={<LucideIcon.Waypoints />}
                  keywords={growthSearchKeywords.network}
                  navid="network"
                  title="Network"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.Globe />}
                  keywords={growthSearchKeywords.explore}
                  navid="explore"
                  title="Ghost Explore"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.Heart />}
                  keywords={growthSearchKeywords.recommendations}
                  navid="recommendations"
                  title="Recommendations"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.ClipboardType />}
                  keywords={growthSearchKeywords.embedSignupForm}
                  navid="embed-signup-form"
                  title="Signup forms"
                  onClick={handleSectionClick}
                />
                {visibility.offers && (
                  <NavItem
                    icon={<LucideIcon.Tag />}
                    keywords={growthSearchKeywords.offers}
                    navid="offers"
                    title="Offers"
                    onClick={handleSectionClick}
                  />
                )}
              </NavSection>

              <NavSection
                isVisible={checkVisible(Object.values(advancedSearchKeywords).flat())}
                title="Advanced"
              >
                <NavItem
                  icon={<LucideIcon.Blocks />}
                  keywords={advancedSearchKeywords.integrations}
                  navid="integrations"
                  title="Integrations"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.Download />}
                  keywords={advancedSearchKeywords.migrationtools}
                  navid="migration"
                  title="Import/Export"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.Code />}
                  keywords={advancedSearchKeywords.codeInjection}
                  navid="code-injection"
                  title="Code injection"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.FlaskConical />}
                  keywords={advancedSearchKeywords.labs}
                  navid="labs"
                  title="Labs"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.History />}
                  keywords={advancedSearchKeywords.history}
                  navid="history"
                  title="History"
                  onClick={handleSectionClick}
                />
                <NavItem
                  icon={<LucideIcon.TriangleAlert />}
                  keywords={advancedSearchKeywords.dangerzone}
                  navid="dangerzone"
                  title="Danger zone"
                  onClick={handleSectionClick}
                />
              </NavSection>
            </>
          )}

          {!filter &&
            (grouped ? (
              showHelp && (
                <SidebarMenu>
                  <NavHelpItem />
                </SidebarMenu>
              )
            ) : (
              <SidebarMenu>
                {aboutItem}
                {showHelp && <NavHelpItem />}
              </SidebarMenu>
            ))}
        </nav>
        {/* The grouped navigation keeps About Ghost in its own footer, below the groups */}
        {grouped && (
          <Box className={cn('shrink-0 pt-2 pb-5', floatingSidebar ? 'px-3' : 'bg-sidebar px-5')}>
            <SidebarMenu>{aboutItem}</SidebarMenu>
          </Box>
        )}
      </NavGroupContext.Provider>
    </Stack>
  );
};

export default Sidebar;
