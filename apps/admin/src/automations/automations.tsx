import AutomationsHelpCards from './components/automations-help-cards';
import AutomationsList from './components/automations-list';
import React from 'react';
import { Badge } from '@tryghost/shade/components';
import { Box, Container } from '@tryghost/shade/primitives';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useVisibleAutomations } from './hooks/use-visible-automations';

const MAX_AUTOMATIONS = 20;

const Automations: React.FC = () => {
  const { automations, automationCount, error, isError, isLoading } = useVisibleAutomations();
  const automationsPerTierEnabled = useFeatureFlag('automationsPerTier');
  const canCreateNewAutomations =
    automationCount !== undefined && automationCount < MAX_AUTOMATIONS;

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
                    <Badge
                      className="px-1 py-px text-[10px] leading-none tracking-wider uppercase"
                      variant="secondary"
                    >
                      Beta
                    </Badge>
                  </span>
                </PageHeader.Title>
              </PageHeader.Left>
              {automationsPerTierEnabled && (
                <PageHeader.Actions>
                  <PageHeader.ActionGroup>
                    <PageHeader.ActionGroup.Primary>
                      <PageHeader.Action
                        disabled={!canCreateNewAutomations}
                        label="New automation"
                        type="button"
                      >
                        New automation
                      </PageHeader.Action>
                    </PageHeader.ActionGroup.Primary>
                  </PageHeader.ActionGroup>
                </PageHeader.Actions>
              )}
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body>
            <AutomationsList automations={automations} isLoading={isLoading} />
            <AutomationsHelpCards />
          </ListPage.Body>
        </ListPage>
      </Container>
    </Box>
  );
};

export default Automations;
