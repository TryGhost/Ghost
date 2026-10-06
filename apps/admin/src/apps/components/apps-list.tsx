import React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { Link } from '@tryghost/admin-x-framework';
import { LucideIcon } from '@tryghost/shade/utils';
import { AppIcon } from './app-icon';
import { DevelopmentBadge } from './development-badge';
import type { AppInstallation } from '@/apps/types';
import { appDeveloper } from '@/apps/lib/manifest';
import { setAppPinned, usePinnedApps } from '@/apps/lib/pins';

interface AppsListProps {
  installations: AppInstallation[];
  onUninstall: (installation: AppInstallation) => void;
}

const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
  if (
    event.defaultPrevented ||
    !(event.target instanceof Element) ||
    // React bubbles clicks from portalled content, like the actions menu, through the row.
    !event.currentTarget.contains(event.target) ||
    event.target.closest('a, button')
  ) {
    return;
  }
  event.currentTarget.querySelector<HTMLAnchorElement>('a[data-app-link]')?.click();
};

/** The site's apps as a list, like Automations and Tags. Clicking a row opens the app. */
const AppsList: React.FC<AppsListProps> = ({ installations, onUninstall }) => {
  const pinnedIds = usePinnedApps();

  return (
    <Table aria-label="Apps" className="table-auto" data-testid="apps-list">
      <TableBody>
        {installations.map((installation) => {
          const { manifest } = installation;
          const pinned = pinnedIds.includes(installation.id);

          return (
            <TableRow
              key={installation.id}
              className="cursor-pointer hover:bg-table-row-hover"
              data-testid="apps-list-row"
              onClick={handleRowClick}
            >
              <TableHead
                className="h-auto p-4 text-left text-base font-normal tracking-normal text-foreground"
                scope="row"
              >
                <Inline gap="lg">
                  <AppIcon color={manifest.color} icon={manifest.icon} size="lg" tone="brand" />
                  <span className="min-w-0">
                    <Inline gap="xs">
                      <span className="text-md font-semibold">{manifest.name}</span>
                      {installation.source === 'link' && <DevelopmentBadge />}
                      <span className="text-sm text-muted-foreground">
                        {appDeveloper(manifest)}
                      </span>
                    </Inline>
                    {manifest.description && (
                      <span className="block max-w-2xl text-balance text-muted-foreground">
                        {manifest.description}
                      </span>
                    )}
                  </span>
                </Inline>
              </TableHead>
              <TableCell className="p-4">
                <Inline gap="xs" justify="end">
                  <Button variant="outline" asChild>
                    <Link to={`/apps/${installation.id}`} data-app-link>
                      Open
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label={`More actions for ${manifest.name}`}
                        size="icon"
                        variant="outline"
                      >
                        <LucideIcon.Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setAppPinned(installation.id, !pinned)}>
                        {pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => onUninstall(installation)}
                      >
                        Uninstall
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Inline>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default AppsList;
