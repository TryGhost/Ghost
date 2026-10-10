import React from 'react';

import { FloatingSidebar, useSidebar } from '@tryghost/shade/components';
import { useLocation } from '@tryghost/admin-x-framework';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';

import AppSidebarHeader from './app-sidebar-header';
import AppSidebarFooter from './app-sidebar-footer';
import AppSidebarContent from './app-sidebar-content';
import { SidebarBodySwap } from './sidebar-body-swap';
import { SidebarSiteIcon, SidebarSiteIdentity } from './sidebar-site-identity';

interface FloatingAppSidebarProps extends Omit<
  React.ComponentProps<typeof FloatingSidebar>,
  'children' | 'header' | 'icon' | 'label' | 'onPinnedChange' | 'pinLocked' | 'pinned' | 'resetKey'
> {
  /**
   * Shows the Settings navigation in the body in place of the main navigation
   * (the sidebar is pinned for it, without its pin button).
   */
  settingsNavigation?: boolean;
  /** Receives the element the Settings navigation renders into. */
  settingsNavigationRef?: (element: HTMLElement | null) => void;
}

/**
 * The admin7Design desktop sidebar: a floating capsule, pinned (Shade's
 * `open`, toggled with its pin button or ⌘B) beside the content, otherwise a
 * circle around the site icon that opens into a panel over the content.
 * Settings keeps it pinned and shows its own navigation in it.
 */
const FloatingAppSidebar = React.forwardRef<HTMLDivElement, FloatingAppSidebarProps>(
  function FloatingAppSidebar(
    { settingsNavigation = false, settingsNavigationRef, ...props },
    ref,
  ) {
    const { open, setOpen } = useSidebar();
    const { pathname } = useLocation();
    const title = useBrowseSite().data?.site.title;

    // Pinning re-renders this; the capsule's contents don't depend on it, so
    // they skip that render rather than delay the morph's first frame.
    const icon = React.useMemo(() => <SidebarSiteIcon />, []);
    const header = React.useMemo(() => <SidebarSiteIdentity variant="capsule" />, []);
    // In Settings the body drills in to its navigation; the account footer goes
    // with the main navigation, as Settings never showed it.
    const body = React.useMemo(
      () => (
        <SidebarBodySwap settings={settingsNavigation} settingsSlotRef={settingsNavigationRef}>
          <AppSidebarHeader className="p-0" showSiteIdentity={false} />
          <AppSidebarContent floating />
          <AppSidebarFooter className="gap-0 p-0 [&_[data-sidebar=group]]:px-0 [&_[data-sidebar=group]]:pb-0" />
        </SidebarBodySwap>
      ),
      [settingsNavigation, settingsNavigationRef],
    );

    return (
      <FloatingSidebar
        ref={ref}
        data-testid="admin-sidebar"
        header={header}
        icon={icon}
        label={title || 'Site navigation'}
        pinLocked={settingsNavigation}
        pinned={open}
        resetKey={pathname}
        onPinnedChange={setOpen}
        {...props}
      >
        {body}
      </FloatingSidebar>
    );
  },
);

export default FloatingAppSidebar;
