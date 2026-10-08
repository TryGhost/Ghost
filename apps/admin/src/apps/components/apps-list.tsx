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
import { Link } from '@tryghost/admin-x-framework';
import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import { AppIcon } from './app-icon';
import { DevelopmentBadge } from './development-badge';
import { appDetailsRoute, appRoute } from '@/apps/lib/routes';
import { isDevelopmentApp } from '@/apps/lib/served-from';
import { openRowLink, openRowLinkInNewTab } from '@/apps/lib/row-link';

interface AppsListProps {
  installations: AppInstallation[];
  onUninstall: (installation: AppInstallation) => void;
}

/**
 * The site's installed apps, like Automations and Tags. A row opens the app; managing it
 * is in the row's menu.
 */
const AppsList: React.FC<AppsListProps> = ({ installations, onUninstall }) => {
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
              onAuxClick={openRowLinkInNewTab}
              onClick={openRowLink}
            >
              <TableHead
                className="h-auto p-4 text-left text-base font-normal tracking-normal text-foreground"
                scope="row"
              >
                <Inline gap="lg">
                  <AppIcon manifest={manifest} size="lg" />
                  <span className="min-w-0">
                    <Inline gap="xs">
                      <Link className="text-md font-semibold" to={appRoute(id)}>
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
                  {status === 'suspended' ? (
                    <Button variant="outline" asChild>
                      <Link to={appRoute(installation.id)}>Review changes</Link>
                    </Button>
                  ) : (
                    <Button variant="outline" asChild>
                      <Link to={appRoute(id)}>Open</Link>
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
                      <DropdownMenuItem asChild>
                        <Link to={appDetailsRoute(id)}>Details</Link>
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
