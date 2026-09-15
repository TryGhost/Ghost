import React from 'react';
import { Box, Container } from '@tryghost/shade/primitives';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { AutomationsTable } from '@/automations/proto/shared/automations-table';
import { lanePath } from '@/automations/proto/shared/lanes';
import { LaneSwitcher } from '@/automations/proto/shared/lane-switcher';
import { PHASE_1_SLUGS } from '@/automations/proto/shared/mock';
import { useProtoAutomations } from '@/automations/proto/shared/store';

// PHASE 1 — the automations list.
//
// Read-only by design. Creating and deleting automations aren't part of this
// release, so there's no Create button and no row menu: the list's whole job is
// to get you into an automation. The phase-2 lane owns CRUD.
//
// It also shows only the automations that REALLY EXIST. A Ghost site has exactly two
// — the free and paid welcome flows — and no way to make a third, because there's no
// trigger column in the schema and a flow's slug is what decides who it's for. The
// other fixtures are inventions that phase 2 and the explorations need in order to
// have anything to explore, so they stay in the shared mock and are filtered out
// here rather than duplicating the fixture set per lane.
//
// Filtered at the list rather than flagged on the record: it's a property of this
// LANE, not of the automation, and a field on the stored record would have to be
// versioned and would then be visible to every screen that reads one.
const LANE = 'phase-1' as const;

const AutomationsList: React.FC = () => {
  const automations = useProtoAutomations().filter((entry) =>
    PHASE_1_SLUGS.includes(entry.automation.slug),
  );

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
