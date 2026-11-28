import React, { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
import { AccessChanges, AccessIndicator } from './components/access-indicator';
import { describeScopeChanges, historyScopeChanges } from './lib/scope-changes';
import { AppIcon } from './components/app-icon';
import { AppsGate } from './components/apps-gate';
import { PinMenuItem } from './components/pin-menu-item';
import { SurfaceLine } from './components/surface-icon';
import { servedFrom } from './lib/served-from';
import { UninstallDialog } from './components/uninstall-dialog';
import { historyTitle } from './lib/history';
import { isInstallationNotFound } from './lib/not-found';
import { appReviewRoute, appRoute } from './lib/routes';
import { useInstalledApps } from './lib/use-app-pins';
import { type InstallationActions, installationActions } from './lib/installation-actions';
import { useAppsAvailability } from './lib/use-apps-availability';
import { AppsUnsupportedBanner } from './components/apps-unsupported';
import { AppAuthor, UnverifiedDeveloperBadge } from './components/app-author';

/** A fact in the sidebar, its label over its value, as on a member's details. */
const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Stack className="min-w-0" data-testid="app-fact" gap="xs">
    <p className="stat-label text-muted-foreground">{label}</p>
    <div className="min-w-0 text-md break-words text-foreground">{children}</div>
  </Stack>
);

/** A titled section of the main column, as on a member's or a tag's details. */
const Section: React.FC<{
  id: string;
  title: string;
  children: React.ReactNode;
}> = ({ id, title, children }) => (
  <section aria-labelledby={id}>
    {/* The section step, as a tag's details use in Admin 7 */}
    <Stack gap="lg">
      <h2 className="section-heading text-base font-semibold" id={id}>
        {title}
      </h2>
      {children}
    </Stack>
  </section>
);

/** A suspension is left to the banner over the sections. */
const StatusBadges: React.FC<{ installation: AppInstallation }> = ({ installation }) => (
  <>
    {installation.manifest.development && <Badge variant="secondary">Development</Badge>}
    {installation.status === 'uninstalled' && <Badge variant="secondary">Uninstalled</Badge>}
  </>
);

/** An entry's title, with who made the change, and its date, across one row. */
const EntrySummary: React.FC<{ entry: AppInstallationHistoryEntry; timezone: string }> = ({
  entry,
  timezone,
}) => (
  <Inline align="baseline" as="span" className="min-w-0 grow" gap="md" justify="between">
    <span className="text-md" data-testid="app-history-entry-title">
      {historyTitle(entry)}
      {entry.actor?.name && <span className="text-muted-foreground"> by {entry.actor.name}</span>}
    </span>
    <span className="shrink-0 text-base text-muted-foreground">
      {formatDisplayDate(entry.created_at, timezone)}
    </span>
  </Inline>
);

/**
 * Each entry, newest first. One that changed the app's access opens to show what changed; one that
 * changed nothing in it is a plain row, laid out as the others are while closed.
 */
const History: React.FC<{ entries: AppInstallationHistoryEntry[]; timezone: string }> = ({
  entries,
  timezone,
}) => {
  // Each change is shown once: an approval shows what it granted, not the suspension too.
  const accessChanges = historyScopeChanges(entries);
  return (
    <Accordion type="single" asChild collapsible>
      <ol className="m-0 list-none p-0">
        {entries.map((entry, index) => {
          const groups = describeScopeChanges(accessChanges[index], {
            pending: entry.event === 'suspended',
          });
          if (groups.length === 0) {
            return (
              <li
                key={entry.id}
                className="flex items-center gap-3 border-b py-4 text-sm first:pt-0 last:border-b-0"
                data-testid="app-history-entry"
              >
                <EntrySummary entry={entry} timezone={timezone} />
                {/* As wide as the chevron of an entry that opens, so the dates line up. */}
                <span className="size-4 shrink-0" />
              </li>
            );
          }
          return (
            <AccordionItem
              key={entry.id}
              className="group/entry last:border-b-0"
              data-testid="app-history-entry"
              value={entry.id}
              asChild
            >
              <li>
                {/* The first entry sits flush under the section's heading. */}
                <AccordionTrigger className="gap-3 font-normal group-first/entry:pt-0 hover:no-underline">
                  <EntrySummary entry={entry} timezone={timezone} />
                </AccordionTrigger>
                <AccordionContent>
                  <AccessChanges groups={groups} />
                </AccordionContent>
              </li>
            </AccordionItem>
          );
        })}
      </ol>
    </Accordion>
  );
};

interface SidebarProps {
  installation: AppInstallation;
  timezone: string;
  /** Where the header doesn't show the app's name large, the sidebar leads with it. */
  showIdentity: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ installation, timezone, showIdentity }) => {
  const { manifest, history = [] } = installation;
  const installer = history.find((entry) => entry.event === 'installed')?.actor?.name;
  // Several surfaces of one kind read as one line.
  const surfaceTypes = [...new Set(manifest.surfaces.map((surface) => surface.type))];
  const uninstalled =
    installation.status === 'uninstalled'
      ? history.find((entry) => entry.event === 'uninstalled')
      : undefined;

  return (
    <aside
      // Above the main column on narrow screens, and on its right on wide ones past a rule,
      // wherever it comes in the DOM.
      className="relative flex w-full shrink-0 flex-col gap-6 max-lg:order-first lg:order-last lg:w-80 lg:self-stretch lg:before:pointer-events-none lg:before:absolute lg:before:inset-y-0 lg:before:-left-10 lg:before:border-l lg:before:border-border lg:before:content-['']"
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
  /** Whether apps can't be used on this site, which the page then says */
  unsupported: boolean;
  actions: InstallationActions;
  timezone: string;
  showIdentity: boolean;
}> = ({ installation, unsupported, actions, timezone, showIdentity }) => {
  const { manifest, status, history = [] } = installation;
  const sidebar = (
    <Sidebar installation={installation} showIdentity={showIdentity} timezone={timezone} />
  );
  // The sidebar comes after the main column, as it shows on wide screens. Where it carries the
  // app's name (showIdentity), though, it comes first, so the page's heading comes before its
  // sections for the keyboard and screen readers too.

  return (
    // Side by side on wide screens. Admin 7 spaces the columns and sections past the scale, as
    // a member's and a tag's details do.
    <Stack
      className="flex-1 [--text-section-heading:var(--text-section-heading-lg)] lg:flex-row lg:items-start lg:gap-12 in-data-[admin7-design=true]:lg:gap-20"
      gap="2xl"
    >
      {showIdentity && sidebar}
      <Stack className="min-w-0 flex-1 in-data-[admin7-design=true]:gap-18" gap="2xl">
        {unsupported && status !== 'uninstalled' && <AppsUnsupportedBanner />}
        {actions.canReview && (
          <Banner data-testid="app-needs-approval" size="md" variant="warning">
            <Text as="p" size="sm">
              {manifest.name} has been updated, and the changes need your approval. It won’t open
              until you approve them.
            </Text>
          </Banner>
        )}

        {status !== 'uninstalled' && (
          <Section id="app-permissions-heading" title="Permissions">
            <Card variant="ruled">
              <CardContent>
                <AccessIndicator manifest={manifest} bare />
              </CardContent>
            </Card>
          </Section>
        )}

        <Section id="app-history-heading" title="History">
          <Card variant="ruled">
            <CardContent className="pt-3">
              <History entries={history} timezone={timezone} />
            </CardContent>
          </Card>
        </Section>
      </Stack>
      {!showIdentity && sidebar}
    </Stack>
  );
};

interface ActionsProps {
  installation: AppInstallation;
  /** Where no app can be opened, only uninstalling is left */
  actions: InstallationActions;
  pins: ReturnType<typeof useInstalledApps>['pins'];
  onUninstall: () => void;
}

const Actions: React.FC<ActionsProps> = ({ installation, actions, pins, onUninstall }) => {
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
            {actions.canPin && (
              <>
                <PinMenuItem
                  full={!pins.canPinMore}
                  pinned={pins.isPinned(installation.id)}
                  onPinnedChange={(pinned) => pins.setPinned(installation.id, pinned)}
                />
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
        {actions.canOpen && (
          <PageHeader.ActionGroup.Primary>
            <PageHeader.Action label="Open" asChild>
              <Link to={appRoute(installation.id)}>Open</Link>
            </PageHeader.Action>
          </PageHeader.ActionGroup.Primary>
        )}
        {actions.canReview && (
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
  const { installationId = '' } = useParams();
  const navigate = useNavigate();
  const [uninstalling, setUninstalling] = useState(false);
  const { data: settingsData } = useBrowseSettings({});
  const timezone = getSiteTimezone(settingsData?.settings ?? []);
  const { data, error, isLoading, refetch } = useReadAppInstallation(installationId, {
    defaultErrorHandler: false,
  });
  const { pins } = useInstalledApps();
  const availability = useAppsAvailability();
  const installation = data?.app_installations[0];
  const actions = installation && installationActions(installation, availability, pins);

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
              {installation && actions && installation.status !== 'uninstalled' && (
                <Actions
                  actions={actions}
                  installation={installation}
                  pins={pins}
                  onUninstall={() => setUninstalling(true)}
                />
              )}
            </PageHeader>
            {/* The title wraps rather than truncates, and stops short of the actions above it
                on wide screens */}
            {largeTitles && (isLoading || installation) && (
              <Stack className="min-w-0 lg:pr-40" gap="sm">
                {isLoading || !installation ? (
                  <>
                    <Inline className="min-w-0" gap="md">
                      <Skeleton className="size-10 rounded-md" />
                      <Skeleton className="h-(--large-title-size) w-64" />
                    </Inline>
                    <Skeleton className="h-4 w-full max-w-md" />
                  </>
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
            className={cn('-mx-3 px-3', largeTitles && 'min-h-auto overflow-visible')}
          >
            {/* While the app loads: the sidebar's column, its name (where the header doesn't
                show it large) over its facts */}
            {!installation && isLoading && (
              <Stack className="w-full max-w-md gap-6" data-testid="app-details-loading">
                {!largeTitles && (
                  <Stack gap="md">
                    <Skeleton className="size-16 rounded-xl" />
                    <Stack gap="sm">
                      <Skeleton className="h-6 w-2/3" />
                      <Skeleton className="h-4 w-full" />
                    </Stack>
                  </Stack>
                )}
                <Stack gap="xl">
                  {['w-3/5', 'w-full', 'w-4/5', 'w-1/2'].map((width) => (
                    <Stack key={width} gap="sm">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className={cn('h-4', width)} />
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            )}
            {installation && actions && (
              <Details
                actions={actions}
                installation={installation}
                showIdentity={!largeTitles}
                timezone={timezone}
                unsupported={availability === 'unsupported'}
              />
            )}
            {!installation && error && (
              <Stack align="center" className="flex-1" gap="md" justify="center">
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
