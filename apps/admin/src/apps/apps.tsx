import React from 'react';
import AppsList from './components/apps-list';
import { AppsFlagGate } from './components/apps-flag-gate';
import { Badge, EmptyIndicator, LoadingIndicator } from '@tryghost/shade/components';
import { Box, Container } from '@tryghost/shade/primitives';
import { ListPage } from '@tryghost/shade/page-templates';
import { LucideIcon } from '@tryghost/shade/utils';
import { PageHeader } from '@tryghost/shade/patterns';
import { useBrowseAppInstallations } from '@tryghost/admin-x-framework/api/app-installations';
import { getErrorMessage } from '@tryghost/admin-x-framework/errors';
import { isUnsupported } from './lib/install-failure';

/** The site's apps, and where the install flow lands. */
export const AppsListing: React.FC = () => {
  // Failures are shown in place: an older Ghost without apps answers 404, which isn't an error.
  const { data, isLoading, error } = useBrowseAppInstallations({ defaultErrorHandler: false });
  const installations = data?.app_installations ?? [];

  let body: React.ReactNode;
  if (error) {
    body = (
      <div className="flex flex-1 items-center justify-center py-16">
        <EmptyIndicator
          description={
            isUnsupported(error)
              ? 'Apps need a newer version of Ghost.'
              : getErrorMessage(error, 'Something went wrong. Please try again.')
          }
          title={isUnsupported(error) ? 'This site can’t install apps yet' : 'Couldn’t load apps'}
        >
          <LucideIcon.LayoutGrid />
        </EmptyIndicator>
      </div>
    );
  } else if (isLoading) {
    body = (
      <div className="flex flex-1 items-center justify-center py-16">
        <LoadingIndicator size="md" />
      </div>
    );
  } else if (installations.length) {
    body = <AppsList installations={installations} />;
  } else {
    body = (
      <div className="flex flex-1 items-center justify-center py-16">
        <EmptyIndicator description="Apps you install show up here." title="No apps yet">
          <LucideIcon.LayoutGrid />
        </EmptyIndicator>
      </div>
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
          <ListPage.Body className="flex flex-col">{body}</ListPage.Body>
        </ListPage>
      </Container>
    </Box>
  );
};

const Apps: React.FC = () => (
  <AppsFlagGate>
    <AppsListing />
  </AppsFlagGate>
);

export default Apps;
