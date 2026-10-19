import React, { useState } from 'react';
import {
  Badge,
  Banner,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  LoadingIndicator,
} from '@tryghost/shade/components';
import { Box, Container, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { DetailPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { formatDisplayDate } from '@tryghost/shade/utils';
import { Link, useNavigate, useParams } from '@tryghost/admin-x-framework';
import {
  type AppInstallation,
  type AppInstallationHistoryEntry,
  useReadAppInstallation,
} from '@tryghost/admin-x-framework/api/app-installations';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { getErrorMessage } from '@tryghost/admin-x-framework/errors';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { NotFound } from '@/shared/not-found';
import { AccessIndicator } from './components/access-indicator';
import { AppIcon } from './components/app-icon';
import { AppPinButton } from './components/app-pin-button';
import { AppsGate } from './components/apps-gate';
import { CapabilitySummary } from './components/surface-icon';
import { UninstallDialog } from './components/uninstall-dialog';
import { ACCOUNT_ACCESS } from './lib/access';
import { historyTitle, installedBy } from './lib/history';
import { isInstallationNotFound } from './lib/not-found';
import { appReviewRoute, appRoute } from './lib/routes';
import { useInstalledApps } from './lib/use-app-pins';
import { isDevelopmentApp } from './lib/served-from';

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[8rem_1fr] gap-4 py-3" data-testid="app-fact">
    <Text as="span" tone="secondary">
      {label}
    </Text>
    <span className="min-w-0 break-words">{children}</span>
  </div>
);

const History: React.FC<{ entries: AppInstallationHistoryEntry[]; timezone: string }> = ({
  entries,
  timezone,
}) => {
  return (
    <ol className="m-0 list-none p-0" data-testid="app-history">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0"
          data-testid="app-history-entry"
        >
          <span>
            {historyTitle(entry)}
            {entry.actor?.name && (
              <Text as="span" tone="secondary">
                {' '}
                by {entry.actor.name}
              </Text>
            )}
          </span>
          <Text as="span" className="shrink-0" size="sm" tone="secondary">
            {formatDisplayDate(entry.created_at, timezone)}
          </Text>
        </li>
      ))}
    </ol>
  );
};

const Details: React.FC<{ installation: AppInstallation; timezone: string }> = ({
  installation,
  timezone,
}) => {
  const { manifest, status, history = [] } = installation;
  const installer = installedBy(history);

  return (
    <Stack className="lg:flex-row lg:items-start lg:gap-12" gap="2xl">
      <Stack className="w-full shrink-0 lg:w-80" gap="xl">
        <Stack gap="md">
          <AppIcon app={installation} size="xl" />
          <Stack gap="xs">
            <Inline gap="xs" wrap>
              <Text as="h1" size="xl" weight="semibold">
                {manifest.name}
              </Text>
              {isDevelopmentApp(manifest) && <Badge variant="secondary">Development</Badge>}
              {status === 'suspended' && <Badge variant="warning">Needs approval</Badge>}
              {status === 'uninstalled' && <Badge variant="secondary">Uninstalled</Badge>}
            </Inline>
            <Text tone="secondary">{manifest.description}</Text>
          </Stack>
        </Stack>

        {status !== 'uninstalled' && <CapabilitySummary manifest={manifest} />}

        <div className="divide-y border-y">
          <Fact label="Made by">
            <a
              className="hover:underline"
              href={manifest.author.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {manifest.author.name}
            </a>
          </Fact>
          <Fact label="Installed">
            {formatDisplayDate(installation.created_at, timezone)}
            {installer && (
              <Text as="span" tone="secondary">
                {' '}
                by {installer}
              </Text>
            )}
          </Fact>
        </div>
      </Stack>

      <Stack className="min-w-0 flex-1" gap="xl">
        {status === 'suspended' && (
          <Banner data-testid="app-needs-approval" size="md" variant="warning">
            <Inline gap="md" justify="between">
              <Text as="p" size="sm">
                {manifest.name} has been updated, and the changes need your approval. It won’t open
                until you approve them.
              </Text>
              <Button size="sm" variant="outline" asChild>
                <Link to={appReviewRoute(installation.manifest_url)}>Review changes</Link>
              </Button>
            </Inline>
          </Banner>
        )}

        {status !== 'uninstalled' && (
          <AccessIndicator
            intro="Apps use the account of whoever opens them, so this app can do everything they can."
            items={ACCOUNT_ACCESS}
          />
        )}

        <Stack gap="sm">
          <Text as="h2" size="lg" weight="semibold">
            History
          </Text>
          <History entries={history} timezone={timezone} />
        </Stack>
      </Stack>
    </Stack>
  );
};

export const AppDetails: React.FC = () => {
  const { installationId = '' } = useParams();
  const navigate = useNavigate();
  const [uninstalling, setUninstalling] = useState(false);
  const { data: settingsData } = useBrowseSettings({});
  const timezone = getSiteTimezone(settingsData?.settings ?? []);
  const { data, error, isLoading, refetch } = useReadAppInstallation(installationId, {
    defaultErrorHandler: false,
  });
  const installation = data?.app_installations[0];
  const { pins } = useInstalledApps();
  const pinned = installation ? pins.isPinned(installation.id) : false;

  if (isInstallationNotFound(error)) {
    return <NotFound />;
  }

  let body: React.ReactNode;
  if (installation) {
    body = <Details installation={installation} timezone={timezone} />;
  } else if (error) {
    body = (
      <Stack align="center" className="py-16" gap="md">
        <Text tone="secondary">
          {getErrorMessage(error, 'Couldn’t load this app. Please try again.')}
        </Text>
        <Button variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </Stack>
    );
  } else if (isLoading) {
    body = (
      <Inline className="py-16" justify="center">
        <LoadingIndicator size="md" />
      </Inline>
    );
  }

  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <DetailPage data-testid="app-details">
          <DetailPage.Header>
            <PageHeader blurredBackground={false} sticky={false}>
              <PageHeader.Left>
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/apps">Apps</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="truncate">
                        {installation?.manifest.name}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </PageHeader.Left>
              {installation && installation.status !== 'uninstalled' && (
                <PageHeader.Actions>
                  <PageHeader.ActionGroup>
                    {pins.isLoaded && (
                      <AppPinButton
                        full={!pins.canPinMore}
                        pinned={pinned}
                        onPinnedChange={(pin) => pins.setPinned(installation.id, pin)}
                      />
                    )}
                    <Button variant="outline" onClick={() => setUninstalling(true)}>
                      Uninstall
                    </Button>
                    {installation.status === 'active' && (
                      <Button asChild>
                        <Link to={appRoute(installation.id)}>Open</Link>
                      </Button>
                    )}
                  </PageHeader.ActionGroup>
                </PageHeader.Actions>
              )}
            </PageHeader>
          </DetailPage.Header>
          <DetailPage.Body>{body}</DetailPage.Body>
        </DetailPage>
      </Container>
      <UninstallDialog
        installation={uninstalling ? (installation ?? null) : null}
        onClose={() => setUninstalling(false)}
        onUninstalled={() => navigate('/apps')}
      />
    </Box>
  );
};

const AppDetailsScreen: React.FC = () => (
  <AppsGate>
    <AppDetails />
  </AppsGate>
);

export default AppDetailsScreen;
