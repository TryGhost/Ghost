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
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from '@tryghost/shade/components';
import { Box, Container, H1, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { DetailPage, usePageChrome } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { useShade } from '@tryghost/shade/app';
import { LucideIcon, cn, formatDisplayDate } from '@tryghost/shade/utils';
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
import { AccessIndicator, OPENED_APP_ACCESS_INTRO } from './components/access-indicator';
import { AppIcon } from './components/app-icon';
import { AppsGate } from './components/apps-gate';
import { SurfaceLine } from './components/surface-icon';
import { servedFrom } from './lib/served-from';
import { UninstallDialog } from './components/uninstall-dialog';
import { historyTitle, installedBy } from './lib/history';
import { isInstallationNotFound } from './lib/not-found';
import { appReviewRoute, appRoute } from './lib/routes';
import { useInstalledApps } from './lib/use-app-pins';
import { AppAuthor, UnverifiedDeveloperBadge } from './components/app-author';

/** A fact in the sidebar, its label over its value, as on a member's details. */
const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Stack className="min-w-0" data-testid="app-fact" gap="sm">
    <p className="stat-label text-muted-foreground">{label}</p>
    <div className="min-w-0 text-md break-words text-foreground">{children}</div>
  </Stack>
);

/** A titled section of the main column, as on a member's or a tag's details. */
const Section: React.FC<{
  id: string;
  title: string;
  /** A line under the heading, kept close to it rather than spaced like the section's content. */
  description?: string;
  children: React.ReactNode;
}> = ({ id, title, description, children }) => (
  <section aria-labelledby={id}>
    {/* Admin 7 spaces sections a little wider than the scale's md step */}
    <Stack className="in-data-[admin7-design=true]:gap-4" gap="md">
      <Stack gap="xs">
        <h3 className="section-heading text-base font-semibold" id={id}>
          {title}
        </h3>
        {description && (
          <Text size="sm" tone="secondary">
            {description}
          </Text>
        )}
      </Stack>
      {children}
    </Stack>
  </section>
);

const StatusBadges: React.FC<{ installation: AppInstallation }> = ({ installation }) => (
  <>
    {installation.manifest.development && <Badge variant="secondary">Development</Badge>}
    {installation.status === 'suspended' && <Badge variant="warning">Needs approval</Badge>}
    {installation.status === 'uninstalled' && <Badge variant="secondary">Uninstalled</Badge>}
  </>
);

const History: React.FC<{ entries: AppInstallationHistoryEntry[]; timezone: string }> = ({
  entries,
  timezone,
}) => (
  <ol className="m-0 list-none divide-y divide-border p-0" data-testid="app-history">
    {entries.map((entry) => (
      <li
        key={entry.id}
        className="py-3 in-data-[admin7-design=true]:py-4 in-data-[admin7-design=true]:first:pt-0"
        data-testid="app-history-entry"
      >
        <Inline align="baseline" gap="md" justify="between">
          <span className="text-sm in-data-[admin7-design=true]:text-md">
            {historyTitle(entry)}
            {entry.actor?.name && (
              <span className="text-muted-foreground"> by {entry.actor.name}</span>
            )}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground in-data-[admin7-design=true]:text-base">
            {formatDisplayDate(entry.created_at, timezone)}
          </span>
        </Inline>
      </li>
    ))}
  </ol>
);

interface SidebarProps {
  installation: AppInstallation;
  timezone: string;
  /** Where the header doesn't show the app's name large, the sidebar leads with it. */
  showIdentity: boolean;
  admin7Design: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  installation,
  timezone,
  showIdentity,
  admin7Design,
}) => {
  const { manifest, history = [] } = installation;
  const installer = installedBy(history);
  // Several surfaces of one kind read as one line.
  const surfaceTypes = [...new Set(manifest.surfaces.map((surface) => surface.type))];
  const uninstalled =
    installation.status === 'uninstalled'
      ? history.find((entry) => entry.event === 'uninstalled')
      : undefined;

  return (
    <aside
      className={cn(
        'flex w-full shrink-0 flex-col gap-6 in-data-[admin7-design=true]:max-lg:order-first lg:w-80',
        admin7Design &&
          "relative lg:self-stretch lg:before:pointer-events-none lg:before:absolute lg:before:inset-y-0 lg:before:-left-10 lg:before:border-l lg:before:border-border lg:before:content-['']",
      )}
      data-testid="app-details-sidebar"
    >
      {showIdentity && (
        <Stack gap="md">
          <AppIcon app={installation} size="xl" />
          <Stack gap="xs">
            <Inline align="baseline" gap="sm" wrap>
              <Text as="h1" size="xl" weight="semibold">
                {manifest.name}
              </Text>
              <StatusBadges installation={installation} />
            </Inline>
            <Text tone="secondary">{manifest.description}</Text>
          </Stack>
        </Stack>
      )}
      <Stack gap="xl">
        <InfoRow label="Made by">
          <Inline gap="xs" wrap>
            <AppAuthor manifest={manifest} />
            <UnverifiedDeveloperBadge manifest={manifest} />
          </Inline>
        </InfoRow>
        {/* What the app does and where its data goes. An uninstalled app does neither. */}
        {installation.status !== 'uninstalled' && (
          <>
            <InfoRow label="Surface">
              <Stack gap="sm">
                {surfaceTypes.map((type) => (
                  <SurfaceLine key={type} color={manifest.accent_color} type={type} />
                ))}
              </Stack>
            </InfoRow>
            <InfoRow label="Data accessed by">{servedFrom(manifest)}</InfoRow>
          </>
        )}
        <InfoRow label="Installed">
          {formatDisplayDate(installation.created_at, timezone)}
          {installer && <span className="text-muted-foreground"> by {installer}</span>}
        </InfoRow>
        {uninstalled && (
          <InfoRow label="Uninstalled">
            {formatDisplayDate(uninstalled.created_at, timezone)}
            {uninstalled.actor?.name && (
              <span className="text-muted-foreground"> by {uninstalled.actor.name}</span>
            )}
          </InfoRow>
        )}
      </Stack>
    </aside>
  );
};

const Details: React.FC<{
  installation: AppInstallation;
  timezone: string;
  showIdentity: boolean;
  admin7Design: boolean;
}> = ({ installation, timezone, showIdentity, admin7Design }) => {
  const { manifest, status, history = [] } = installation;
  const sidebar = (
    <Sidebar
      admin7Design={admin7Design}
      installation={installation}
      showIdentity={showIdentity}
      timezone={timezone}
    />
  );
  // Lists in a section sit in a ruled card in Admin 7, and an outlined one before it.
  const cardVariant = admin7Design ? 'ruled' : 'outline';

  return (
    // Side by side on wide screens, at the member page's gaps, which go past the scale
    <Stack
      className="flex-1 in-data-[admin7-design=true]:[--text-section-heading:var(--text-section-heading-lg)] lg:flex-row lg:items-start lg:gap-12 in-data-[admin7-design=true]:lg:gap-20"
      gap="2xl"
    >
      {!admin7Design && sidebar}
      <Stack className="min-w-0 flex-1 in-data-[admin7-design=true]:gap-18" gap="2xl">
        {status === 'suspended' && (
          <Banner data-testid="app-needs-approval" size="md" variant="warning">
            <Text as="p" size="sm">
              {manifest.name} has been updated, and the changes need your approval. It won’t open
              until you approve them.
            </Text>
          </Banner>
        )}

        {status !== 'uninstalled' && (
          <Section
            description={OPENED_APP_ACCESS_INTRO}
            id="app-permissions-heading"
            title="Permissions"
          >
            <Card variant={cardVariant}>
              <CardContent className={admin7Design ? undefined : 'pt-6'}>
                <AccessIndicator manifest={manifest} bare />
              </CardContent>
            </Card>
          </Section>
        )}

        <Section id="app-history-heading" title="History">
          <Card variant={cardVariant}>
            <CardContent className="pt-3">
              <History entries={history} timezone={timezone} />
            </CardContent>
          </Card>
        </Section>
      </Stack>
      {/* Admin 7 shows the sidebar on the right, so it comes after the main column for the
          keyboard too. */}
      {admin7Design && sidebar}
    </Stack>
  );
};

interface ActionsProps {
  installation: AppInstallation;
  onUninstall: () => void;
}

const Actions: React.FC<ActionsProps> = ({ installation, onUninstall }) => {
  const { pins } = useInstalledApps();
  const pinned = pins.isPinned(installation.id);

  return (
    <PageHeader.Actions>
      <PageHeader.ActionGroup>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <PageHeader.Action label="App actions" iconOnly>
              <LucideIcon.Ellipsis />
            </PageHeader.Action>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {pins.isLoaded && (
              <>
                {/* Disabled without a reason when no more apps fit, as in the Apps list. */}
                <DropdownMenuItem
                  disabled={!pinned && !pins.canPinMore}
                  onSelect={() => pins.setPinned(installation.id, !pinned)}
                >
                  {pinned ? <LucideIcon.PinOff /> : <LucideIcon.Pin />}
                  {pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={onUninstall}
            >
              <LucideIcon.Trash />
              Uninstall
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {installation.status === 'active' && (
          <PageHeader.ActionGroup.Primary>
            <PageHeader.Action label="Open" asChild>
              <Link to={appRoute(installation.id)}>Open</Link>
            </PageHeader.Action>
          </PageHeader.ActionGroup.Primary>
        )}
        {installation.status === 'suspended' && (
          <PageHeader.ActionGroup.Primary>
            <PageHeader.Action label="Review changes" asChild>
              <Link to={appReviewRoute(installation.manifest_url)}>Review changes</Link>
            </PageHeader.Action>
          </PageHeader.ActionGroup.Primary>
        )}
      </PageHeader.ActionGroup>
    </PageHeader.Actions>
  );
};

export const AppDetails: React.FC = () => {
  // Where list pages show their titles large (admin7Design), the app's name shows large under
  // the breadcrumb, as a tag's and a member's do.
  const { largeTitles } = usePageChrome();
  const { admin7Design } = useShade();
  const { installationId = '' } = useParams();
  const navigate = useNavigate();
  const [uninstalling, setUninstalling] = useState(false);
  const { data: settingsData } = useBrowseSettings({});
  const timezone = getSiteTimezone(settingsData?.settings ?? []);
  const { data, error, isLoading, refetch } = useReadAppInstallation(installationId, {
    defaultErrorHandler: false,
  });
  const installation = data?.app_installations[0];

  if (isInstallationNotFound(error)) {
    return <NotFound />;
  }

  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <DetailPage className={cn(largeTitles && 'h-auto')} data-testid="app-details">
          <DetailPage.Header
            className={cn(
              largeTitles &&
                '-mx-(--page-gutter) gap-1 bg-background px-(--page-gutter) pt-(--large-title-space)! pb-8',
            )}
          >
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
                      {isLoading ? (
                        <Skeleton className="h-4 w-40" />
                      ) : (
                        <BreadcrumbPage className="truncate">
                          {installation?.manifest.name}
                        </BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </PageHeader.Left>
              {installation && installation.status !== 'uninstalled' && (
                <Actions installation={installation} onUninstall={() => setUninstalling(true)} />
              )}
            </PageHeader>
            {/* The title wraps rather than truncates, and stops short of the actions above it
                on wide screens */}
            {largeTitles && (isLoading || installation) && (
              <Stack className="min-w-0 lg:pr-40" gap="sm">
                {isLoading || !installation ? (
                  <Skeleton className="h-(--large-title-size) w-64" />
                ) : (
                  <>
                    <Inline className="min-w-0" gap="md">
                      <AppIcon app={installation} size="md" />
                      {/* Badges sit on the title's baseline, as on a tag's details and the
                          list pages' titles */}
                      <Inline align="baseline" className="min-w-0" gap="md" wrap>
                        <H1
                          className="min-w-0 text-[length:var(--large-title-size)]! leading-[1.15]! font-title! tracking-[-0.03em]! break-words"
                          data-testid="app-details-title"
                        >
                          {installation.manifest.name}
                        </H1>
                        <StatusBadges installation={installation} />
                      </Inline>
                    </Inline>
                    <Text tone="secondary">{installation.manifest.description}</Text>
                  </>
                )}
              </Stack>
            )}
          </DetailPage.Header>

          <DetailPage.Body
            className={cn(
              'in-data-[admin7-design=true]:-mx-3 in-data-[admin7-design=true]:px-3',
              largeTitles && 'min-h-auto overflow-visible',
            )}
          >
            {installation && (
              <Details
                admin7Design={admin7Design}
                installation={installation}
                showIdentity={!largeTitles}
                timezone={timezone}
              />
            )}
            {!installation && error && (
              <Stack
                align="center"
                className="flex-1"
                data-testid="app-details-load-error"
                gap="md"
                justify="center"
              >
                <p className="text-muted-foreground">
                  {getErrorMessage(error, 'Couldn’t load this app. Please try again.')}
                </p>
                <Button variant="outline" onClick={() => void refetch()}>
                  Retry
                </Button>
              </Stack>
            )}
          </DetailPage.Body>
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
