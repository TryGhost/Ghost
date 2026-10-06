import React from 'react';
import { Badge, Table, TableBody, TableHead, TableRow } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import { AppIcon } from './app-icon';
import { DevelopmentBadge } from './development-badge';
import { isDevelopmentApp, servedFrom } from '@/apps/lib/served-from';

/** The site's installed apps, like Automations and Tags. Opening and managing them comes later. */
const AppsList: React.FC<{ installations: AppInstallation[] }> = ({ installations }) => (
  <Table aria-label="Apps" className="table-auto" data-testid="apps-list">
    <TableBody>
      {installations.map(({ id, status, manifest }) => (
        <TableRow key={id} data-testid="apps-list-row">
          <TableHead
            className="h-auto p-4 text-left text-base font-normal tracking-normal text-foreground"
            scope="row"
          >
            <Inline gap="lg">
              <AppIcon manifest={manifest} size="lg" />
              <span className="min-w-0">
                <Inline gap="xs">
                  <span className="text-md font-semibold">{manifest.name}</span>
                  {isDevelopmentApp(manifest) && <DevelopmentBadge />}
                  {status === 'suspended' && <Badge variant="secondary">Needs approval</Badge>}
                  <span className="text-sm text-muted-foreground">
                    {manifest.author.name} · {servedFrom(manifest)}
                  </span>
                </Inline>
                <span className="block max-w-2xl text-balance text-muted-foreground">
                  {manifest.description}
                </span>
              </span>
            </Inline>
          </TableHead>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default AppsList;
