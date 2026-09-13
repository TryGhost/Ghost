import React from 'react';
import { Box, Container } from '@tryghost/shade/primitives';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { AutomationsTable } from '@/automations/proto/shared/automations-table';
import { lanePath } from '@/automations/proto/shared/lanes';
import { LaneSwitcher } from '@/automations/proto/shared/lane-switcher';
import { useProtoAutomations } from '@/automations/proto/shared/store';

// EXPLORATION — the automations list.
//
// Read-only, same as phase 1. What this lane explores is the automation screen's
// chrome, not the list, so the list stays out of the way. CRUD lives in phase 2.
const LANE = 'exploration' as const;

const AutomationsList: React.FC = () => {
  const automations = useProtoAutomations();

  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <ListPage data-testid="automations-proto-exploration">
          <ListPage.Header>
            <PageHeader blurredBackground={false} sticky={false}>
              <PageHeader.Left>
                <PageHeader.Title>Automations</PageHeader.Title>
              </PageHeader.Left>
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body>
            <AutomationsTable automations={automations} basePath={lanePath(LANE)} />
          </ListPage.Body>
        </ListPage>
      </Container>
      <LaneSwitcher lane={LANE} />
    </Box>
  );
};

export default AutomationsList;
export const Component = AutomationsList;
