import React from 'react';
import { Box, Container } from '@tryghost/shade/primitives';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { AutomationsTable } from '@/automations/proto/shared/automations-table';
import { lanePath } from '@/automations/proto/shared/lanes';
import { LaneSwitcher } from '@/automations/proto/shared/lane-switcher';
import { useProtoAutomations } from '@/automations/proto/shared/store';

// PHASE 1 — the automations list.
//
// Read-only by design. Creating and deleting automations aren't part of this
// release, so there's no Create button and no row menu: the list's whole job is
// to get you into an automation. The phase-2 lane owns CRUD.
const LANE = 'phase-1' as const;

const AutomationsList: React.FC = () => {
  const automations = useProtoAutomations();

  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <ListPage data-testid="automations-proto-phase-1">
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
