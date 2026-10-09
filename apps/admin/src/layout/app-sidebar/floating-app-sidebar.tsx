import React from 'react';

import { FloatingSidebar, useSidebar } from '@tryghost/shade/components';
import { useLocation } from '@tryghost/admin-x-framework';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';

import AppSidebarHeader from './app-sidebar-header';
import AppSidebarFooter from './app-sidebar-footer';
import AppSidebarContent from './app-sidebar-content';
import { SidebarSiteIcon, SidebarSiteIdentity } from './sidebar-site-identity';

type FloatingAppSidebarProps = Omit<
  React.ComponentProps<typeof FloatingSidebar>,
  'children' | 'header' | 'icon' | 'label' | 'onPinnedChange' | 'pinned' | 'resetKey'
>;

/**
 * The admin7Design desktop sidebar: a floating capsule, pinned (Shade's
 * `open`, toggled with its pin button or ⌘B) beside the content, otherwise a
 * circle around the site icon that opens into a panel over the content.
 */
const FloatingAppSidebar = React.forwardRef<HTMLDivElement, FloatingAppSidebarProps>(
  function FloatingAppSidebar(props, ref) {
    const { open, setOpen } = useSidebar();
    const { pathname } = useLocation();
    const title = useBrowseSite().data?.site.title;

    // Pinning re-renders this; the capsule's contents don't depend on it, so
    // they skip that render rather than delay the morph's first frame.
    const icon = React.useMemo(() => <SidebarSiteIcon />, []);
    const header = React.useMemo(() => <SidebarSiteIdentity variant="capsule" />, []);
    const body = React.useMemo(
      () => (
        <>
          <AppSidebarHeader className="p-0" showSiteIdentity={false} />
          <AppSidebarContent floating />
          <AppSidebarFooter className="gap-0 p-0 [&_[data-sidebar=group]]:px-0 [&_[data-sidebar=group]]:pb-0" />
        </>
      ),
      [],
    );

    return (
      <FloatingSidebar
        ref={ref}
        data-testid="admin-sidebar"
        header={header}
        icon={icon}
        label={title || 'Site navigation'}
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
