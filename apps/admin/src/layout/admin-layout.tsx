import { ActivityPubHostLayoutProvider } from '@tryghost/activitypub/api';
import React from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import { FLOATING_SIDEBAR_SPRING, SidebarInset, SidebarProvider } from '@tryghost/shade/components';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isContributorUser } from '@tryghost/admin-x-framework/api/users';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useAdminSidebarVisibility, useIsSettingsSidebarRoute } from '@/layout/sidebar-visibility';
import { cn, useIsMobile } from '@tryghost/shade/utils';
import AppSidebar from './app-sidebar';
import FloatingAppSidebar from './app-sidebar/floating-app-sidebar';
import {
  useNavigationPreferences,
  useSidebarMode,
} from './app-sidebar/hooks/use-navigation-preferences';
import { useSettingsPinMorph } from './app-sidebar/hooks/use-settings-pin-morph';
import SettingsSidebar from './app-sidebar/settings-sidebar';
import {
  SettingsNavigationSlotContext,
  SettingsSidebarMorphingContext,
} from './settings-navigation';
import { SidebarSwapTransition } from './sidebar-swap-transition';
import { MobileNavBar } from './app-sidebar/mobile-nav-bar';
import { SkipLink } from './skip-link';
import { ContributorUserMenu } from './app-sidebar/user-menu';
import { DunningBanner, DunningOverlay, useDunningLockTakeover } from '@/dunning';
import { AdminFrame, type AdminFrameMode } from './admin-frame';
import { AdminFrameTopBar } from './admin-frame-top-bar';
import { FloatingSidebarContentSync } from './floating-sidebar-content-sync';
import { GlobalSearchProvider } from '@/global-search/global-search-provider';

const networkPageChrome = {
  contentClassName: 'max-w-[1920px]',
  contentGutter: 'var(--page-gutter)',
  // The floating sidebar already provides the cover's 8px left gap.
  profileContentClassName: 'sidebar:pl-0',
};

const pageChromeClassName = [
  '[&_.max-w-page]:max-w-(--content-width)',
  '[&_[data-list-page=list-page]]:px-(--page-gutter)',
  '[&_[data-detail-page=detail-page]]:px-(--page-gutter)',
  '[&_[data-list-page=header]]:-mx-(--page-gutter)',
  '[&_[data-list-page=header]]:px-(--page-gutter)',
  '[&_[data-list-page=header]]:pt-[28px]',
  '[&_[data-detail-page=header]]:pt-[28px]',
  '[&_[data-network-header=header]]:pt-[8px]',
  '[&_[data-page-header=main]]:flex-wrap',
  '[&_[data-page-header=left]]:h-auto',
  '[&_[data-page-header=left]]:max-w-full',
  '[&_[data-view-site-preview]]:inset-y-2!',
  '[&_[data-view-site-preview]]:right-2!',
  '[&_[data-view-site-preview]]:left-0!',
  '[&_[data-view-site-preview]]:h-[calc(100%-16px)]!',
  '[&_[data-view-site-preview]]:w-[calc(100%-8px)]!',
  '[&_[data-view-site-preview]]:rounded-xl!',
  '[&_[data-view-site-preview]]:border!',
  '[&_[data-view-site-preview]]:border-[var(--border-subtle)]!',
].join(' ');

/*
 * Unpinned, the floating sidebar's closed circle sits over the content's
 * top-left corner; its footprint (inset + diameter + inset) is set as
 * `--floating-sidebar-*` variables on the inset (see
 * FloatingSidebarContentSync). Padding the
 * content area by the footprint less the page gutter keeps it clear beside
 * the circle: the page column's left edge sits at its centred place or the
 * footprint, whichever is further right, so centred content with room to
 * spare is unaffected and narrower viewports get symmetric padding that keeps
 * it centred. Below the desktop breakpoint the mobile layout takes over.
 */
const compactPageChromeClassName = [
  '[--compact-page-padding:max(0px,calc(var(--floating-sidebar-footprint)_-_var(--page-gutter)))]',
  'px-(--compact-page-padding)',
  '[--page-bleed-start:var(--compact-page-padding)]',
  '[--page-bleed-end:var(--compact-page-padding)]',
].join(' ');

/*
 * A page backdrop (e.g. the member map) runs full bleed, to the scrollport's
 * edges: `--page-bleed-start` and `--page-bleed-end` are how far those lie
 * beyond the page's content box (`<main>`'s padding, and the pinned sidebar's
 * gap). While a backdrop is on the page, the scrollport reaches beneath the
 * pinned sidebar, so the backdrop shows through its glass, and the backdrop
 * holds still while the page slides as the sidebar pins and unpins (see
 * FloatingSidebarContentSync).
 */
const pinnedPageChromeClassName = '[--page-bleed-start:var(--floating-sidebar-gap)]';
// The inset is the scrollport: its padding box is what clips. It stays put
// while the page inside it slides, so a backdrop never shows an edge.
const backdropInsetClassName = [
  'has-[[data-page-backdrop]]:-ml-(--floating-sidebar-gap)',
  'has-[[data-page-backdrop]]:pl-(--floating-sidebar-gap)',
  // Beneath the pinned capsule too, it keeps the page's stacking under it
  'has-[[data-page-backdrop]]:isolate',
].join(' ');

const SIDEBAR_PANEL_CLASS_NAME = '[&>[data-sidebar=sidebar]]:relative';
// Lands on the desktop panel only; the mobile sidebar is a sheet that ignores it.
const SIDEBAR_SCREEN_TRANSITION_CLASS_NAME =
  'screen-exit-sidebar [view-transition-name:admin-sidebar]';
// The floating sidebar names its capsule rather than the wrapper around it: a
// view transition name makes an element a backdrop root, so on the wrapper the
// capsule's backdrop blur would see nothing behind it.
const FLOATING_SIDEBAR_SCREEN_TRANSITION_CLASS_NAME =
  'screen-exit-sidebar [&>[data-slot=floating-sidebar]]:[view-transition-name:admin-sidebar]';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { data: currentUser } = useCurrentUser();
  const routeShowsSidebar = useAdminSidebarVisibility();
  const [settingsNavigationSlot, setSettingsNavigationSlot] = React.useState<HTMLElement | null>(
    null,
  );
  const dunningLocked = useDunningLockTakeover();
  const isContributor = currentUser && isContributorUser(currentUser);
  const isSettingsRoute = useIsSettingsSidebarRoute();
  const isMobile = useIsMobile();
  const admin7Design = useFeatureFlag('admin7Design');
  const isViewSiteRoute = useLocation().pathname === '/site';

  // With admin7Design, the desktop page sits inside a frame: a top bar and
  // thin bezels around a rounded card. View site becomes a place of its own,
  // switched to from the top bar, so it shows without the sidebar, and
  // full-screen screens (the editor) close the frame altogether.
  const adminFrame = admin7Design && !isContributor;
  const framed = adminFrame && !isMobile;
  const sidebarVisible = routeShowsSidebar && !(framed && isViewSiteRoute);
  let frameMode: AdminFrameMode = 'full';
  if (!framed) {
    frameMode = 'off';
  } else if (!routeShowsSidebar) {
    frameMode = 'hidden';
  } else if (isViewSiteRoute) {
    frameMode = 'site';
  }
  const sidebarClassName = cn(
    SIDEBAR_PANEL_CLASS_NAME,
    SIDEBAR_SCREEN_TRANSITION_CLASS_NAME,
    dunningLocked && 'opacity-40',
  );
  const floatingSidebarClassName = cn(
    FLOATING_SIDEBAR_SCREEN_TRANSITION_CLASS_NAME,
    // On the capsule for the same reason (opacity makes a backdrop root too)
    dunningLocked && '[&>[data-slot=floating-sidebar]]:opacity-40',
  );

  // With admin7Design, the desktop sidebar is a floating capsule, pinned
  // ("full" mode, docked beside the content) or not ("compact": a circle that
  // opens over the content). Shade's open state is "pinned", so ⌘B toggles
  // it. Mobile keeps Shade's sheet.
  //
  // Settings shows its navigation in the same
  // capsule, pinned whatever the stored mode, which it leaves alone: entering
  // it from compact pins the capsule, and leaving returns to the stored mode.
  // From compact the capsule grows to full height on a plain ease as the body
  // swaps to the Settings navigation, and shrinks back as it swaps back.
  const floatingSidebar = admin7Design && !isContributor && sidebarVisible && !isMobile;
  const settingsNavigation = floatingSidebar && isSettingsRoute;
  const [sidebarMode, setSidebarMode] = useSidebarMode();
  const { isFetched: sidebarModeLoaded } = useNavigationPreferences();
  const settingsPinMorph = useSettingsPinMorph(
    settingsNavigation,
    floatingSidebar && sidebarMode !== 'full',
  );
  const sidebarPinned = !floatingSidebar || settingsNavigation || sidebarMode === 'full';
  // Shade's `open`: the floating sidebar's `pinned`
  const sidebarOpen = !!currentUser && sidebarVisible && sidebarPinned;
  const settingsSidebarMorphing = settingsNavigation && settingsPinMorph.morphStyle === 'ease';
  const onSidebarOpenChange = React.useCallback(
    (open: boolean) => {
      if (!settingsNavigation) {
        setSidebarMode(open ? 'full' : 'compact');
      }
    },
    [settingsNavigation, setSidebarMode],
  );

  // The dunning takeover is positioned against the scrollable inset, so the
  // inset must not scroll (and must sit at the top) while the takeover is up —
  // otherwise the covered page scrolls back into view from underneath it
  const insetRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (dunningLocked) {
      insetRef.current?.scrollTo?.(0, 0);
    }
  }, [dunningLocked, sidebarVisible, isSettingsRoute]);

  // The covered regions become `inert` while the takeover is up: aria-modal is
  // only a semantic hint, so without this the covered page stays reachable by
  // keyboard and assistive technology. Applied through refs because React 18
  // has no first-class inert prop. Whichever refs the active layout branch
  // doesn't render stay null and are skipped.
  //
  // A layout effect on purpose: layout effects run before passive-effect
  // cleanups, so on dismissal inert is cleared before the overlay's cleanup
  // restores focus — focus() on a still-inert element is a silent no-op.
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const mainRef = React.useRef<HTMLElement>(null);
  const contributorMenuRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    for (const region of [mainRef.current, contributorMenuRef.current]) {
      if (region) {
        region.inert = dunningLocked;
      }
    }
  }, [dunningLocked]);

  // The sidebar is a covered region too. No deps: it remounts as the sidebar
  // comes and goes (full-screen routes, Settings, crossing the mobile breakpoint).
  React.useLayoutEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.inert = dunningLocked;
    }
  });

  // Entering and leaving Settings in the floating sidebar is no screen
  // transition (the capsule animates its swap itself), so the page fades in
  // under it rather than swap in a frame.
  const previousSettingsNavigation = React.useRef(settingsNavigation);
  React.useLayoutEffect(() => {
    if (previousSettingsNavigation.current === settingsNavigation) {
      return;
    }
    previousSettingsNavigation.current = settingsNavigation;
    const main = mainRef.current;
    if (
      !main ||
      typeof main.animate !== 'function' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const fade = main.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 240,
      easing: FLOATING_SIDEBAR_SPRING,
    });
    return () => fade.cancel();
  }, [settingsNavigation]);

  // Contributors get a floating profile menu instead of the full sidebar
  if (isContributor) {
    return (
      <div className="relative h-full bg-background">
        {!dunningLocked && <SkipLink target={mainRef} />}
        <main ref={mainRef} className="flex h-full flex-col overflow-y-auto focus:outline-hidden">
          <DunningBanner />
          <div className="min-h-0 flex-1">{children}</div>
        </main>
        <div
          ref={contributorMenuRef}
          className="fixed bottom-3.5 left-3.5 z-20 lg:bottom-8 lg:left-8"
        >
          <ContributorUserMenu />
        </div>
        <DunningOverlay />
      </div>
    );
  }

  const sidebarLayout = (
    <SidebarProvider
      className={cn(
        sidebarVisible &&
          'overflow-hidden [--content-width:1080px] [--page-gutter:20px] sidebar:[--page-gutter:40px] min-[1380px]:[--content-width:1280px] [&>main]:min-w-0',
        // The floating capsule has its own surface
        sidebarVisible &&
          !floatingSidebar &&
          '[&_[data-sidebar=sidebar]]:rounded-xl [&_[data-sidebar=sidebar]]:border-border [&_[data-sidebar=sidebar]]:shadow-none',
      )}
      open={sidebarOpen}
      style={sidebarVisible ? ({ '--sidebar-width': '316px' } as React.CSSProperties) : undefined}
      onOpenChange={floatingSidebar ? onSidebarOpenChange : undefined}
    >
      {floatingSidebar ? (
        <FloatingAppSidebar
          ref={sidebarRef}
          animate={sidebarModeLoaded}
          className={floatingSidebarClassName}
          disabled={dunningLocked}
          morphStyle={settingsPinMorph.morphStyle}
          settingsNavigation={settingsNavigation}
          settingsNavigationRef={setSettingsNavigationSlot}
          onPinnedMorphEnd={settingsPinMorph.onPinnedMorphEnd}
        />
      ) : (
        <>
          {sidebarVisible &&
            (isSettingsRoute ? (
              <SettingsSidebar
                ref={sidebarRef}
                className={sidebarClassName}
                slotRef={setSettingsNavigationSlot}
                variant="floating"
              />
            ) : (
              <AppSidebar ref={sidebarRef} className={sidebarClassName} variant="floating" />
            ))}
          <SidebarSwapTransition settingsRoute={isSettingsRoute} sidebarRef={sidebarRef} />
        </>
      )}
      <SidebarInset
        ref={insetRef}
        className={cn(
          'relative bg-background sidebar:max-h-full',
          // Keeps the content's own stacking (sticky headers are z-50) under
          // the capsule floating over it.
          !sidebarPinned && 'isolate',
          dunningLocked ? 'overflow-hidden' : 'overflow-y-auto',
          // The page slides inside it as the sidebar pins and unpins, which
          // mustn't show a horizontal scrollbar
          floatingSidebar && !dunningLocked && 'overflow-x-hidden',
          floatingSidebar && backdropInsetClassName,
          sidebarVisible ? 'max-h-[calc(100%-var(--mobile-navbar-height))]' : 'max-h-full',
        )}
      >
        <DunningBanner />
        <main
          ref={mainRef}
          className={cn(
            'flex-1 focus:outline-hidden',
            sidebarVisible ? pageChromeClassName : 'min-h-0',
            floatingSidebar &&
              (sidebarPinned ? pinnedPageChromeClassName : compactPageChromeClassName),
            isSettingsRoute && 'min-h-0',
            // Once the bezels have retracted around it
            frameMode === 'site' &&
              '[&_[data-view-site-preview]]:animate-[admin-frame-fade-in_500ms_ease-out_520ms_both]',
            'screen-exit-content',
          )}
        >
          <ActivityPubHostLayoutProvider value={sidebarVisible ? networkPageChrome : undefined}>
            {/* Only on Settings routes with their navigation: the floating
                sidebar keeps its slot mounted, and an Editor's Settings keeps
                the main navigation */}
            <SettingsNavigationSlotContext.Provider
              value={isSettingsRoute ? settingsNavigationSlot : null}
            >
              <SettingsSidebarMorphingContext.Provider value={settingsSidebarMorphing}>
                {children}
              </SettingsSidebarMorphingContext.Provider>
            </SettingsNavigationSlotContext.Provider>
          </ActivityPubHostLayoutProvider>
        </main>
        {/* The mobile nav sits outside the takeover's cover (fixed, above the
            inset) and its sheet opens in a portal, so it unmounts entirely
            rather than relying on inert */}
        {!dunningLocked && <MobileNavBar />}
        <DunningOverlay />
      </SidebarInset>
      {/* After the inset, so its refs are attached when this first sets its variables */}
      {floatingSidebar && (
        <FloatingSidebarContentSync
          animate={sidebarModeLoaded}
          contentRef={insetRef}
          morphStyle={settingsPinMorph.morphStyle}
          pinned={sidebarOpen}
          slideRef={mainRef}
        />
      )}
    </SidebarProvider>
  );

  return (
    <GlobalSearchProvider>
      {!dunningLocked && <SkipLink target={mainRef} />}
      {adminFrame ? (
        <AdminFrame locked={dunningLocked} mode={frameMode} topBar={<AdminFrameTopBar />}>
          {sidebarLayout}
        </AdminFrame>
      ) : (
        sidebarLayout
      )}
    </GlobalSearchProvider>
  );
}
