import React, { useState } from 'react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  RowPrimaryAction,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { Link } from '@tryghost/admin-x-framework';
import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import { AppIcon } from './app-icon';
import { PinMenuItem } from './pin-menu-item';
import { appDetailsRoute, appReviewRoute, appRoute } from '@/apps/lib/routes';
import type { AppPinsState } from '@/apps/lib/use-app-pins';

interface AppsListProps {
  installations: AppInstallation[];
  onUninstall: (installation: AppInstallation) => void;
  /** Pinning to the sidebar; left out, the menu doesn't offer it. */
  pins?: Pick<AppPinsState, 'isPinned' | 'canPinMore' | 'setPinned'>;
}

/**
 * One app, styled as a post is on the posts list: Shade's row hover, and buttons that turn white
 * while the row is hovered, to stand out from its background.
 */
const AppRow: React.FC<
  { installation: AppInstallation } & Pick<AppsListProps, 'onUninstall' | 'pins'>
> = ({ installation, onUninstall, pins }) => {
  const { id, status, manifest } = installation;
  const [isHovered, setIsHovered] = useState(false);
  return (
    <TableRow
      data-testid="apps-list-row"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <TableHead
        className="h-auto p-4 text-left text-base font-normal tracking-normal text-foreground"
        scope="row"
      >
        <Inline gap="lg">
          <AppIcon app={installation} size="lg" />
          <span className="min-w-0">
            <Inline gap="xs">
              <RowPrimaryAction asChild>
                <Link className="text-md font-semibold" to={appRoute(id)}>
                  {manifest.name}
                </Link>
              </RowPrimaryAction>
              {manifest.development && <Badge variant="secondary">Development</Badge>}
              <span className="text-sm text-muted-foreground">{manifest.author.name}</span>
            </Inline>
            <span className="relative z-10 block max-w-2xl text-balance text-muted-foreground">
              {manifest.description}
            </span>
          </span>
        </Inline>
      </TableHead>
      <TableCell className="relative z-10 p-4">
        <Inline gap="xs" justify="end">
          {/* The row opens the app, so only an app waiting for approval gets a button. */}
          {status === 'suspended' && (
            <Button
              className={cn('hover:bg-background', isHovered && 'bg-background')}
              variant="outline"
              asChild
            >
              <Link to={appReviewRoute(installation.manifest_url)}>Review changes</Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* Quiet until the row is hovered, then outlined, as a post's action is */}
              <Button
                aria-label={`More actions for ${manifest.name}`}
                className={cn(
                  'text-muted-foreground hover:bg-background hover:text-foreground',
                  isHovered && 'bg-background',
                )}
                size="icon"
                variant={isHovered ? 'outline' : 'ghost'}
              >
                <LucideIcon.Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* The same items, icons and order as the menu on an app's details */}
              <DropdownMenuItem asChild>
                <Link to={appDetailsRoute(id)}>
                  <LucideIcon.Info />
                  Details
                </Link>
              </DropdownMenuItem>
              {pins && (
                <PinMenuItem
                  full={!pins.canPinMore}
                  pinned={pins.isPinned(id)}
                  onPinnedChange={(pinned) => pins.setPinned(id, pinned)}
                />
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onUninstall(installation)}
              >
                <LucideIcon.Trash />
                Uninstall
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Inline>
      </TableCell>
    </TableRow>
  );
};

const AppsList: React.FC<AppsListProps> = ({ installations, onUninstall, pins }) => (
  <Table aria-label="Apps" className="table-auto" data-testid="apps-list">
    <TableBody>
      {installations.map((installation) => (
        <AppRow
          key={installation.id}
          installation={installation}
          pins={pins}
          onUninstall={onUninstall}
        />
      ))}
    </TableBody>
  </Table>
);

export default AppsList;
