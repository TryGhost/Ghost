import React from 'react';
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from '@tryghost/shade/components';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { Grid, Stack } from '@tryghost/shade/primitives';
import { useIsActiveLink } from './use-is-active-link';
import { AdminLink } from '@/shared/admin-link';

function NavMenuItem({ children, ...props }: React.ComponentProps<typeof SidebarMenuItem>) {
  return <SidebarMenuItem {...props}>{children}</SidebarMenuItem>;
}

interface NavMenuCollapsibleContextValue {
  expanded: boolean;
  id: string;
  onExpandedChange: (expanded: boolean) => void | Promise<void>;
}

const NavMenuCollapsibleContext = React.createContext<NavMenuCollapsibleContextValue | null>(null);

function useNavMenuCollapsibleContext() {
  const context = React.useContext(NavMenuCollapsibleContext);

  if (!context) {
    throw new Error(
      'NavMenuItem.Collapsible components must be used within NavMenuItem.Collapsible',
    );
  }

  return context;
}

interface NavMenuCollapsibleProps {
  children: React.ReactNode;
  expanded: boolean;
  id: string;
  onExpandedChange: (expanded: boolean) => void | Promise<void>;
}

function NavMenuCollapsible({ children, expanded, id, onExpandedChange }: NavMenuCollapsibleProps) {
  const value = {
    expanded,
    id,
    onExpandedChange,
  };

  return (
    <NavMenuCollapsibleContext.Provider value={value}>
      {children}
    </NavMenuCollapsibleContext.Provider>
  );
}

interface NavMenuCollapsibleItemProps {
  ariaLabel: string;
  children: React.ReactNode;
}

function NavMenuCollapsibleItem({ ariaLabel, children }: NavMenuCollapsibleItemProps) {
  const { expanded, id, onExpandedChange } = useNavMenuCollapsibleContext();
  const admin7Design = useFeatureFlag('admin7Design');

  if (admin7Design) {
    return <NavMenuItem>{children}</NavMenuItem>;
  }

  return (
    <NavMenuItem>
      <button
        aria-controls={id}
        aria-expanded={expanded}
        aria-label={ariaLabel}
        className="hover:text-gray-black absolute top-0 left-3 inline-flex h-(--control-height) w-auto items-center justify-center rounded-control bg-transparent p-0 text-md text-sidebar-accent-foreground transition-all group-hover/menu-item:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden sidebar:opacity-0"
        type="button"
        onClick={() => void onExpandedChange(!expanded)}
      >
        <LucideIcon.ChevronRight
          className={`transition-all ${expanded ? 'rotate-[90deg]' : ''}`}
          size={16}
          strokeWidth={1.5}
        />
      </button>
      {children}
    </NavMenuItem>
  );
}

interface NavMenuCollapsibleMenuProps {
  children: React.ReactNode;
}

function NavMenuCollapsibleMenu({ children }: NavMenuCollapsibleMenuProps) {
  const { expanded, id } = useNavMenuCollapsibleContext();
  const admin7Design = useFeatureFlag('admin7Design');

  if (admin7Design) {
    return (
      <AnimatedNavMenuCollapsibleMenu expanded={expanded} id={id}>
        {children}
      </AnimatedNavMenuCollapsibleMenu>
    );
  }

  return (
    <div
      className={`grid transition-all duration-200 ease-out ${expanded ? 'grid-rows-[1fr]' : '-mb-px grid-rows-[0fr]'}`}
      id={id}
    >
      <div className="flex flex-col gap-px overflow-hidden">{expanded ? children : null}</div>
    </div>
  );
}

/** Keeps the rows in place so the grid can close around their full height. */
function AnimatedNavMenuCollapsibleMenu({
  children,
  expanded,
  id,
}: NavMenuCollapsibleMenuProps & { expanded: boolean; id: string }) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const wasExpanded = React.useRef(expanded);
  const animations = React.useRef<Animation[]>([]);

  React.useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }
    menu.inert = !expanded;
    const opening = expanded && !wasExpanded.current;
    wasExpanded.current = expanded;
    if (!opening) {
      return;
    }

    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Match the Settings sidebar's row entrances: 300ms, 18ms apart, from 24px left.
    menu.querySelectorAll<HTMLElement>('[data-sidebar=menu-item]').forEach((row, index) => {
      animations.current.push(
        row.animate(
          [
            { opacity: 0, transform: 'translateX(-24px)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: 300,
            delay: Math.min(index * 18, 300),
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'backwards',
          },
        ),
      );
    });
  }, [expanded]);

  React.useEffect(() => () => animations.current.forEach((animation) => animation.cancel()), []);

  return (
    <Grid
      ref={menuRef}
      aria-hidden={!expanded || undefined}
      className={cn(
        'transition-[grid-template-rows] duration-260 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
        expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
      gap="none"
      id={id}
    >
      <Stack
        className={cn(
          'min-h-0 overflow-hidden transition-opacity duration-150 motion-reduce:transition-none',
          expanded ? 'opacity-100' : 'opacity-0',
        )}
        gap="none"
      >
        {children}
      </Stack>
    </Grid>
  );
}

type NavMenuLinkProps = React.ComponentProps<typeof SidebarMenuButton> & {
  to?: string;
  target?: string;
  rel?: string;
  state?: unknown;
  activeOnSubpath?: boolean;
  isActive?: boolean;
};
function NavMenuLink({
  to,
  target,
  rel,
  state,
  activeOnSubpath = false,
  isActive: controlledIsActive,
  children,
  ...props
}: NavMenuLinkProps) {
  const path = `/${to?.replace(/^\/?#\//, '')}`;
  const computedIsActive = useIsActiveLink({ path: to, activeOnSubpath });
  const isActive = controlledIsActive !== undefined ? controlledIsActive : computedIsActive;
  const { isMobile, setOpenMobile } = useSidebar();
  const isExternal = target === '_blank';

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarMenuButton isActive={isActive} asChild {...props}>
      {isExternal ? (
        <a
          aria-current={isActive ? 'page' : undefined}
          href={to}
          rel={rel ?? 'noopener noreferrer'}
          target={target}
          onClick={handleClick}
        >
          {children}
        </a>
      ) : (
        <AdminLink
          aria-current={isActive ? 'page' : undefined}
          rel={rel}
          state={state}
          to={path}
          onClick={handleClick}
        >
          {children}
        </AdminLink>
      )}
    </SidebarMenuButton>
  );
}

interface NavMenuLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}
function NavMenuLabel({ children, ...props }: NavMenuLabelProps) {
  return (
    <span {...props} className={cn('min-w-0 truncate', props.className)}>
      {children}
    </span>
  );
}

type NavSubmenuItemProps = NavMenuLinkProps;
function NavSubmenuItem({ children, className, ...props }: NavSubmenuItemProps) {
  const admin7Design = useFeatureFlag('admin7Design');

  return (
    <NavMenuItem
      className={cn(
        !admin7Design &&
          'before:absolute before:inset-y-0 before:left-5 before:z-10 before:w-px before:bg-sidebar-accent',
      )}
    >
      <div className="min-w-0 pl-7">
        <NavMenuItem.Link
          className={cn(
            'w-full min-w-0 pl-2 focus-visible:ring-inset',
            admin7Design && 'font-[425]',
            className,
          )}
          {...props}
        >
          {children}
        </NavMenuItem.Link>
      </div>
    </NavMenuItem>
  );
}

type NavMenuButtonProps = React.ComponentProps<typeof SidebarMenuButton> & {
  onClick?: () => void;
};
function NavMenuButton({ onClick, children, ...props }: NavMenuButtonProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    onClick?.();
  };

  return (
    <SidebarMenuButton onClick={handleClick} {...props}>
      {children}
    </SidebarMenuButton>
  );
}

NavMenuItem.Link = NavMenuLink;
NavMenuItem.Label = NavMenuLabel;
NavMenuItem.SubmenuItem = NavSubmenuItem;
NavMenuItem.Button = NavMenuButton;
NavMenuItem.Collapsible = NavMenuCollapsible;
NavMenuItem.CollapsibleItem = NavMenuCollapsibleItem;
NavMenuItem.CollapsibleMenu = NavMenuCollapsibleMenu;

export { NavMenuItem, NavMenuLink, NavMenuLabel, NavSubmenuItem, NavMenuButton };
