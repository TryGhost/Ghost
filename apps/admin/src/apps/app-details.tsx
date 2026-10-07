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
import { useBrowseActions } from '@tryghost/admin-x-framework/api/actions';
import {
  type AppInstallation,
  useReadAppInstallation,
} from '@tryghost/admin-x-framework/api/app-installations';
import { APIError, getErrorMessage } from '@tryghost/admin-x-framework/errors';
import { NotFound } from '@/shared/not-found';
import { AppIcon } from './components/app-icon';
import { AppsGate } from './components/apps-gate';
import { DevelopmentBadge } from './components/development-badge';
import { UninstallDialog } from './components/uninstall-dialog';
import { type AppHistoryEntry, appHistory, installedBy } from './lib/history';
import { appReviewRoute } from './lib/routes';
import { isDevelopmentApp, servedFrom } from './lib/served-from';

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[8rem_1fr] gap-4 py-3">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="m-0 min-w-0 break-words">{children}</dd>
  </div>
);

const History: React.FC<{ entries: AppHistoryEntry[] }> = ({ entries }) => (
  <ol className="m-0 list-none p-0" data-testid="app-history">
    {entries.map((entry) => (
      <li
        key={entry.id}
        className="flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0"
        data-testid="app-history-entry"
      >
        <span>
          {entry.title}
          {entry.by && (
            <Text as="span" tone="secondary">
              {' '}
              by {entry.by}
            </Text>
          )}
        </span>
        <Text as="span" className="shrink-0" size="sm" tone="secondary">
          {formatDisplayDate(entry.at)}
        </Text>
      </li>
    ))}
  </ol>
);

const Details: React.FC<{ installation: AppInstallation }> = ({ installation }) => {
  const navigate = useNavigate();
  const { manifest, status } = installation;
  // Staff history keeps who installed, approved and uninstalled the app.
  const { data } = useBrowseActions({
    searchParams: {
      include: 'actor',
      limit: 'all',
      filter: `resource_type:app_installation+resource_id:'${installation.id}'`,
    },
  });
  const actions = data?.actions ?? [];
  const installer = installedBy(actions);

  return (
    <Stack gap="xl">
      <Inline align="start" gap="lg">
        <AppIcon manifest={manifest} size="lg" />
        <Stack gap="xs">
          <Inline gap="xs">
            <Text as="h1" size="xl" weight="semibold">
              {manifest.name}
            </Text>
            {isDevelopmentApp(manifest) && <DevelopmentBadge />}
            {status === 'suspended' && <Badge variant="warning">Needs approval</Badge>}
            {status === 'uninstalled' && <Badge variant="secondary">Uninstalled</Badge>}
          </Inline>
          <Text tone="secondary">{manifest.description}</Text>
        </Stack>
      </Inline>

      {status === 'suspended' && (
        <Banner data-testid="app-needs-approval" size="md" variant="warning">
          <Inline gap="md" justify="between">
            <Text as="p" size="sm">
              {manifest.name} has been updated and needs more access. It won’t open until you
              approve the changes.
            </Text>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(appReviewRoute(installation.manifest_url))}
            >
              Review changes
            </Button>
          </Inline>
        </Banner>
      )}

      <dl className="m-0 divide-y border-y">
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
        <Fact label="Runs on">
          <span data-testid="app-details-served-from">{servedFrom(manifest)}</span>
        </Fact>
        <Fact label="Installed">
          {formatDisplayDate(installation.created_at)}
          {installer && (
            <Text as="span" tone="secondary">
              {' '}
              by {installer}
            </Text>
          )}
        </Fact>
      </dl>

      <Stack gap="sm">
        <Text as="h2" size="lg" weight="semibold">
          History
        </Text>
        <History entries={appHistory(actions, installation.manifests ?? [])} />
      </Stack>
    </Stack>
  );
};

/** One installed app: who it is, where it runs, what happened to it, and uninstalling it. */
export const AppDetails: React.FC = () => {
  const { installationId = '' } = useParams();
  const navigate = useNavigate();
  const [uninstalling, setUninstalling] = useState<AppInstallation | null>(null);
  const { data, error, isLoading, refetch } = useReadAppInstallation(installationId, {
    defaultErrorHandler: false,
  });
  const installation = data?.app_installations[0];

  if (error instanceof APIError && error.response?.status === 404) {
    return <NotFound />;
  }

  let body: React.ReactNode;
  if (installation) {
    body = <Details installation={installation} />;
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
      <div className="flex justify-center py-16">
        <LoadingIndicator size="md" />
      </div>
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
                    <Button variant="outline" onClick={() => setUninstalling(installation)}>
                      Uninstall
                    </Button>
                  </PageHeader.ActionGroup>
                </PageHeader.Actions>
              )}
            </PageHeader>
          </DetailPage.Header>
          <DetailPage.Body>{body}</DetailPage.Body>
        </DetailPage>
      </Container>
      <UninstallDialog
        installation={uninstalling}
        onOpenChange={(open) => {
          if (!open) {
            setUninstalling(null);
          }
        }}
        // Nothing is left to manage here once it has ended.
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
