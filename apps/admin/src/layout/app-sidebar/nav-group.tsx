import React from 'react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from '@tryghost/shade/components';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { AdminLink } from '@/shared/admin-link';

/**
 * A group of nav items, optionally under an eyebrow:
 *
 *   <NavGroup>
 *     <NavGroup.Label>Content</NavGroup.Label>
 *     <NavGroup.Menu>…</NavGroup.Menu>
 *   </NavGroup>
 */
function NavGroup(props: React.ComponentProps<typeof SidebarGroup>) {
  return <SidebarGroup {...props} />;
}

const EYEBROW_CLASS_NAME = 'h-6 text-xs font-semibold tracking-[0.08em] uppercase';

/** The eyebrow over a group: small caps, a little tracked out. */
function NavGroupLabel({ className, ...props }: React.ComponentProps<typeof SidebarGroupLabel>) {
  return <SidebarGroupLabel className={cn(EYEBROW_CLASS_NAME, className)} {...props} />;
}

interface NavGroupLabelLinkProps {
  to: string;
  /** The link's page is the current one. */
  isActive?: boolean;
  children: React.ReactNode;
}

/** An eyebrow that links to the group's own page, with a chevron: "Apps ›". */
function NavGroupLabelLink({ to, isActive = false, children }: NavGroupLabelLinkProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <NavGroupLabel asChild>
      <AdminLink
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'w-fit gap-0.5 hover:text-sidebar-foreground',
          isActive && 'text-sidebar-foreground',
        )}
        to={to}
        onClick={() => {
          if (isMobile) {
            setOpenMobile(false);
          }
        }}
      >
        {children}
        <LucideIcon.ChevronRight aria-hidden="true" className="size-3!" strokeWidth={2} />
      </AdminLink>
    </NavGroupLabel>
  );
}

/** The group's items. */
function NavGroupMenu({ children }: { children: React.ReactNode }) {
  return (
    <SidebarGroupContent>
      <SidebarMenu>{children}</SidebarMenu>
    </SidebarGroupContent>
  );
}

NavGroup.Label = NavGroupLabel;
NavGroup.LabelLink = NavGroupLabelLink;
NavGroup.Menu = NavGroupMenu;

export { NavGroup };
