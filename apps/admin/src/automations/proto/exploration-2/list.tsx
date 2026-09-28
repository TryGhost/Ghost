import React from 'react';
import { Box, Container } from '@tryghost/shade/primitives';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { AutomationsTable } from '@/automations/proto/shared/automations-table';
import { lanePath } from '@/automations/proto/shared/lanes';
import { laneShowsTrigger } from '@/automations/proto/shared/capabilities';
import { LaneSwitcher } from '@/automations/proto/shared/lane-switcher';
import { useProtoAutomations } from '@/automations/proto/shared/store';

// EXPLORATION — the automations list.
//
// Read-only, same as phase 1. What this lane explores is the automation screen's
// chrome, not the list, so the list stays out of the way. CRUD lives in phase 2.
const LANE = 'exploration-2' as const;

const AutomationsList: React.FC = () => {
  // Only what this lane could have built — see shared/capabilities. The store is
  // one list shared by every lane, so an automation on a trigger this lane
  // doesn't offer isn't its business to show.
  const automations = useProtoAutomations().filter((entry) =>
    laneShowsTrigger(LANE, entry.trigger),
  );

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
