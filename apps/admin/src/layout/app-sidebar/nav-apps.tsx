import React from 'react';
import {
  type SidebarGroup,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { AppNavIcon, PINS_FULL_MESSAGE, type SidebarApp, useSidebarApps } from '@/apps/api';
import { NavGroup } from './nav-group';
import { NavMenuItem } from './nav-menu-item';
import { PinToggle } from './pin-toggle';

interface NavAppPinProps {
  name: string;
  pinned: boolean;
  /** No room to pin another app. */
  full: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

/**
 * Shows on hover or focus, like Posts' "+", and always where there's no hover.
 * The wrapper does the showing, so a disabled pin's own fade doesn't override it.
 */
function NavAppPin({ name, pinned, full, onPinnedChange }: NavAppPinProps) {
  const toggle = (
    <PinToggle
      aria-disabled={full || undefined}
      pinLabel={`Pin ${name} to the sidebar`}
      pinned={pinned}
      unpinLabel={`Unpin ${name} from the sidebar`}
      onPinnedChange={onPinnedChange}
    />
  );

  return (
    <span className="absolute top-1/2 right-0.5 flex -translate-y-1/2 transition-opacity group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 group-data-[collapsible=icon]:hidden sidebar:opacity-0">
      {full ? (
        <Tooltip>
          <TooltipTrigger asChild>{toggle}</TooltipTrigger>
          <TooltipContent side="right">{PINS_FULL_MESSAGE}</TooltipContent>
        </Tooltip>
      ) : (
        toggle
      )}
    </span>
  );
}

function NavApp({
  app,
  canPinMore,
  setPinned,
}: {
  app: SidebarApp;
  canPinMore: boolean;
  setPinned: (installationId: string, pinned: boolean) => void;
}) {
  const { installation, to, isActive, isPinned } = app;
  const { name } = installation.manifest;

  return (
    <NavMenuItem data-testid="nav-app">
      <NavMenuItem.Link
        className="group-focus-within/menu-item:pr-10 group-hover/menu-item:pr-10 max-sidebar:pr-10"
        isActive={isActive}
        title={name}
        to={to.replace(/^\//, '')}
      >
        <AppNavIcon app={installation} />
        <NavMenuItem.Label className="grow">{name}</NavMenuItem.Label>
        {installation.status === 'suspended' && (
          <span
            aria-label="Needs approval"
            className="size-2 shrink-0 rounded-full bg-state-warning"
            data-testid="nav-app-needs-approval"
            role="img"
          />
        )}
      </NavMenuItem.Link>
      <NavAppPin
        full={!isPinned && !canPinMore}
        name={name}
        pinned={isPinned}
        onPinnedChange={(pinned) => setPinned(installation.id, pinned)}
      />
    </NavMenuItem>
  );
}

/**
 * Installed apps under an "Apps ›" eyebrow that links to the Apps page. See
 * useSidebarApps for which apps are listed when.
 */
function NavApps(props: React.ComponentProps<typeof SidebarGroup>) {
  const { visible, onAppsPage, apps, canPinMore, setPinned } = useSidebarApps();

  if (!visible) {
    return null;
  }

  return (
    <NavGroup data-testid="nav-apps" {...props}>
      <NavGroup.LabelLink isActive={onAppsPage} to="/apps">
        Apps
      </NavGroup.LabelLink>
      {apps.length > 0 && (
        <TooltipProvider>
          <NavGroup.Menu>
            {apps.map((app) => (
              <NavApp
                key={app.installation.id}
                app={app}
                canPinMore={canPinMore}
                setPinned={setPinned}
              />
            ))}
          </NavGroup.Menu>
        </TooltipProvider>
      )}
    </NavGroup>
  );
}

export default NavApps;
