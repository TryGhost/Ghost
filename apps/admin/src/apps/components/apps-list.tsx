import React from 'react';
import {
  Badge,
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
import { LucideIcon } from '@tryghost/shade/utils';
import { Link, useNavigate } from '@tryghost/admin-x-framework';
import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import { AppIcon } from './app-icon';
import { DevelopmentBadge } from './development-badge';
import { appDetailsRoute, appReviewRoute } from '@/apps/lib/routes';
import { isDevelopmentApp } from '@/apps/lib/served-from';

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

/**
 * The site's installed apps, like Automations and Tags. A row leads to the app's details;
 * opening the app itself comes with app pages.
 */
const AppsList: React.FC<AppsListProps> = ({ installations, onUninstall }) => {
  const navigate = useNavigate();

  return (
    <Table aria-label="Apps" className="table-auto" data-testid="apps-list">
      <TableBody>
        {installations.map((installation) => {
          const { id, status, manifest } = installation;
          return (
            <TableRow
              key={id}
              className="cursor-pointer hover:bg-table-row-hover"
              data-testid="apps-list-row"
              onClick={handleRowClick}
            >
              <TableHead
                className="h-auto p-4 text-left text-base font-normal tracking-normal text-foreground"
                scope="row"
              >
                <Inline gap="lg">
                  <AppIcon manifest={manifest} size="lg" />
                  <span className="min-w-0">
                    <Inline gap="xs">
                      <Link
                        className="text-md font-semibold"
                        to={appDetailsRoute(id)}
                        data-app-link
                      >
                        {manifest.name}
                      </Link>
                      {isDevelopmentApp(manifest) && <DevelopmentBadge />}
                      {status === 'suspended' && (
                        <Badge data-testid="app-needs-approval-badge" variant="warning">
                          Needs approval
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">{manifest.author.name}</span>
                    </Inline>
                    <span className="block max-w-2xl text-balance text-muted-foreground">
                      {manifest.description}
                    </span>
                  </span>
                </Inline>
              </TableHead>
              <TableCell className="p-4">
                <Inline gap="xs" justify="end">
                  {status === 'suspended' && (
                    <Button
                      variant="outline"
                      onClick={() => navigate(appReviewRoute(installation.manifest_url))}
                    >
                      Review changes
                    </Button>
                  )}
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
