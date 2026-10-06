import React, { useState } from 'react';
import AppsHelpCards from './components/apps-help-cards';
import AppsList from './components/apps-list';
import { AppsFlagGate } from './components/apps-flag-gate';
import { Box, Container } from '@tryghost/shade/primitives';
import { Badge, EmptyIndicator } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { UninstallDialog } from './components/uninstall-dialog';
import { toast } from 'sonner';
import { setAppPinned } from './lib/pins';
import { uninstallApp, useActiveInstallations } from './lib/installations';
import type { AppInstallation } from './types';

/** One list of the site's apps; each can be opened or uninstalled from here. */
export const AppsListing: React.FC = () => {
  const installations = useActiveInstallations();
  const [uninstalling, setUninstalling] = useState<AppInstallation | null>(null);

  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <ListPage data-testid="apps-page">
          <ListPage.Header>
            <PageHeader blurredBackground={false} sticky={false}>
              <PageHeader.Left>
                <PageHeader.Title>
                  {/* Same Beta badge as Automations. */}
                  <span className="inline-flex items-baseline gap-2">
                    Apps
                    <Badge
                      className="px-1 py-px text-[10px] leading-none tracking-wider uppercase"
                      variant="secondary"
                    >
                      Beta
                    </Badge>
                  </span>
                </PageHeader.Title>
              </PageHeader.Left>
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body className="flex flex-col">
            {installations.length ? (
              <AppsList installations={installations} onUninstall={setUninstalling} />
            ) : (
              <div className="flex flex-1 items-center justify-center py-16">
                <EmptyIndicator description="Apps you install show up here." title="No apps yet">
                  <LucideIcon.LayoutGrid />
                </EmptyIndicator>
              </div>
            )}
            <AppsHelpCards />
          </ListPage.Body>
        </ListPage>
      </Container>
      <UninstallDialog
        installation={uninstalling}
        onConfirm={(installation) => {
          uninstallApp(installation.id);
          setAppPinned(installation.id, false);
          setUninstalling(null);
          toast.success(`${installation.manifest.name} uninstalled`);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setUninstalling(null);
          }
        }}
      />
    </Box>
  );
};

const Apps: React.FC = () => (
  <AppsFlagGate>
    <AppsListing />
  </AppsFlagGate>
);

export default Apps;
