import AutomationsHelpCards from './components/automations-help-cards';
import AutomationsList, { type AutomationsToShow } from './components/automations-list';
import React from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import { Badge, Select, SelectContent, SelectItem, SelectValue } from '@tryghost/shade/components';
import { Box, Container } from '@tryghost/shade/primitives';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { canManageAutomations } from '@tryghost/admin-x-framework/api/users';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useVisibleAutomations } from './hooks/use-visible-automations';
import { useIdlePreload } from '@/shared/use-idle-preload';
import { lazyAutomationEditorScreen } from './api';
import { apiUrl } from '@tryghost/admin-x-framework/api/automations';

const MAX_AUTOMATIONS = 50;

function preloadAutomationEditor(): void {
  // A failure is left for the editor route's own load to surface.
  lazyAutomationEditorScreen().catch(() => undefined);
}

const Automations: React.FC = () => {
  const navigate = useNavigate();
  const { automations, automationCount, error, isError, isLoading } = useVisibleAutomations();
  useIdlePreload(preloadAutomationEditor, true);
  const { data: currentUser } = useCurrentUser();
  const [automationsToShow, setAutomationsToShow] =
    React.useState<AutomationsToShow>('non-archived');
  const hasArchivedAutomations = automations?.some(
    (automation) => automation.status === 'archived',
  );
  const canCreateNewAutomations =
    !!currentUser &&
    canManageAutomations(currentUser) &&
    automationCount !== undefined &&
    automationCount < MAX_AUTOMATIONS;

  const runBenchmark = async () => {
    const count = window.prompt('Number of runs', '1000');
    if (count === null) return;
    const steps = window.prompt('Steps (comma separated: wait,send_email)', 'wait,send_email');
    if (steps === null) return;
    try {
      const response = await fetch(apiUrl('/automations/benchmark-drain/'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numberOfRuns: Number(count),
          steps: steps.split(',').map((step) => step.trim()),
        }),
      });
      window.alert(await response.text());
    } catch (error) {
      window.alert(String(error));
    }
  };

  if (isError) {
    throw error instanceof Error ? error : new Error('Failed to load automations');
  }

  return (
    <Box className="size-full" data-sentry-mask="true">
      <Container className="relative flex h-full flex-col" size="page">
        <ListPage data-testid="automations-page">
          <ListPage.Header>
            <PageHeader blurredBackground={false} sticky={false}>
              <PageHeader.Left>
                <PageHeader.Title>
                  <span className="inline-flex items-baseline gap-2">
                    Automations
                    <Badge variant="secondary">Beta</Badge>
                  </span>
                </PageHeader.Title>
              </PageHeader.Left>
              <PageHeader.Actions>
                <PageHeader.ActionGroup>
                  <PageHeader.Action
                    label="Benchmark drain"
                    type="button"
                    onClick={() => void runBenchmark()}
                  >
                    Benchmark drain
                  </PageHeader.Action>
                  {hasArchivedAutomations && (
                    <Select
                      value={automationsToShow}
                      onValueChange={(value: AutomationsToShow) => setAutomationsToShow(value)}
                    >
                      <PageHeader.SelectTrigger
                        label="Automations to show"
                        tooltip={false}
                        variant="default"
                        showChevron
                      >
                        <SelectValue />
                      </PageHeader.SelectTrigger>
                      <SelectContent>
                        <SelectItem value="non-archived">Active automations</SelectItem>
                        <SelectItem value="archived">Archived automations</SelectItem>
                        <SelectItem value="all">All automations</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <PageHeader.ActionGroup.Primary>
                    <PageHeader.Action
                      disabled={!canCreateNewAutomations}
                      label="New automation"
                      type="button"
                      onClick={() => navigate('/automations/new')}
                    >
                      New automation
                    </PageHeader.Action>
                  </PageHeader.ActionGroup.Primary>
                </PageHeader.ActionGroup>
              </PageHeader.Actions>
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body>
            <AutomationsList
              automations={automations ?? []}
              automationsToShow={automationsToShow}
              canManage={!!currentUser && canManageAutomations(currentUser)}
              isLoading={isLoading}
            />
            <AutomationsHelpCards />
          </ListPage.Body>
        </ListPage>
      </Container>
    </Box>
  );
};

export default Automations;
