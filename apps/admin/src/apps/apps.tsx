import React, { useState } from 'react';
import AppsList from './components/apps-list';
import { AppsGate } from './components/apps-gate';
import { UninstallDialog } from './components/uninstall-dialog';
import { Badge, EmptyIndicator, LoadingIndicator } from '@tryghost/shade/components';
import { Box, Container } from '@tryghost/shade/primitives';
import { ListPage } from '@tryghost/shade/page-templates';
import { LucideIcon } from '@tryghost/shade/utils';
import { PageHeader } from '@tryghost/shade/patterns';
import {
  type AppInstallation,
  useBrowseAppInstallations,
} from '@tryghost/admin-x-framework/api/app-installations';
import { getErrorMessage } from '@tryghost/admin-x-framework/errors';
import { useAppPins } from './lib/use-app-pins';

const NO_INSTALLATIONS: AppInstallation[] = [];

/** Fills the page with what it's given in the middle: a state the list can't show yet. */
const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-1 items-center justify-center py-16">{children}</div>
);

/** The site's apps, and where the install flow lands. */
export const AppsListing: React.FC = () => {
  const { data, isLoading, error } = useBrowseAppInstallations({ defaultErrorHandler: false });
  const installations = data?.app_installations ?? NO_INSTALLATIONS;
  const [uninstalling, setUninstalling] = useState<AppInstallation | null>(null);
  const pins = useAppPins(installations);

  let body: React.ReactNode;
  if (error) {
    body = (
      <Centered>
        <EmptyIndicator
          description={getErrorMessage(error, 'Something went wrong. Please try again.')}
          title="Couldn’t load apps"
        >
          <LucideIcon.LayoutGrid />
        </EmptyIndicator>
      </Centered>
    );
  } else if (isLoading) {
    body = (
      <Centered>
        <LoadingIndicator size="md" />
      </Centered>
    );
  } else if (installations.length) {
    body = (
      <AppsList
        installations={installations}
        pins={pins.isLoaded ? pins : undefined}
        onUninstall={setUninstalling}
      />
    );
  } else {
    body = (
      <Centered>
        <EmptyIndicator description="Apps you install show up here." title="No apps yet">
          <LucideIcon.LayoutGrid />
        </EmptyIndicator>
      </Centered>
    );
  }

  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <ListPage data-testid="apps-page">
          <ListPage.Header>
            <PageHeader blurredBackground={false} sticky={false}>
              <PageHeader.Left>
                <PageHeader.Title>
                  <span className="inline-flex items-baseline gap-2">
                    Apps
                    <Badge variant="secondary">Beta</Badge>
                  </span>
                </PageHeader.Title>
              </PageHeader.Left>
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body className="flex flex-col">{body}</ListPage.Body>
        </ListPage>
      </Container>
      <UninstallDialog installation={uninstalling} onClose={() => setUninstalling(null)} />
    </Box>
  );
};

const Apps: React.FC = () => (
  <AppsGate>
    <AppsListing />
  </AppsGate>
);

export default Apps;
