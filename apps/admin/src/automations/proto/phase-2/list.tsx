import React, { useState } from 'react';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { useNavigate } from '@tryghost/admin-x-framework';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  EmptyIndicator,
  buttonVariants,
} from '@tryghost/shade/components';
import { Box, Container } from '@tryghost/shade/primitives';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { AutomationsTable } from '@/automations/proto/shared/automations-table';
import { lanePath } from '@/automations/proto/shared/lanes';
import { LaneSwitcher } from '@/automations/proto/shared/lane-switcher';
import {
  createAutomation,
  deleteAutomation,
  useProtoAutomations,
} from '@/automations/proto/shared/store';
import { useVersionLink } from '@/automations/proto/shared/use-version-link';

// PHASE 2 — the automations list, with CRUD.
//
// This is the lane where automations can be made and removed. Phase 1's list is
// read-only and stays that way.
const LANE = 'phase-2' as const;

const AutomationsList: React.FC = () => {
  const navigate = useNavigate();
  const toVersioned = useVersionLink();
  const automations = useProtoAutomations();
  // Held rather than confirmed per row, so the list has one dialog instead of
  // one behind every overflow menu.
  const [pendingDelete, setPendingDelete] = useState<AutomationDetail | null>(null);

  // Creating writes immediately and goes straight to the automation. There's no
  // name-it-first dialog: the automation is named for you ("New automation", then
  // numbered), and the first real decision — what starts it — is the trigger card
  // waiting on the canvas. A modal asking for a name before you have decided the
  // automation exists is a step you would have to undo to change your mind.
  const handleCreate = () => {
    navigate(toVersioned(`${lanePath(LANE)}/${createAutomation()}`));
  };

  const confirmDelete = () => {
    if (!pendingDelete) {
      return;
    }
    deleteAutomation(pendingDelete.id);
    setPendingDelete(null);
    toast.success('Automation deleted');
  };

  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <ListPage data-testid="automations-proto-phase-2">
          <ListPage.Header>
            <PageHeader blurredBackground={false} sticky={false}>
              <PageHeader.Left>
                <PageHeader.Title>Automations</PageHeader.Title>
              </PageHeader.Left>
              <PageHeader.Actions>
                {/* Only the product's own action. Resetting the prototype's data
                                    used to sit beside it in a ⋯ , which put scaffolding among
                                    features with nothing to tell a reviewer which was which;
                                    it lives in the lane switcher now, where everything is
                                    admittedly scaffolding. */}
                {/* "New <noun>", as every list header in the app says it —
                                tags, members. The empty state below says it the longer way,
                                which is the same split those lists make: a header CTA is a
                                compact label beside other chrome, an empty state's button is
                                the whole invitation and can afford a sentence. */}
                <Button onClick={handleCreate}>New automation</Button>
              </PageHeader.Actions>
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body>
            {automations.length === 0 ? (
              <EmptyIndicator
                actions={<Button onClick={handleCreate}>Create a new automation</Button>}
                description="Automations you create will show up here."
                title="No automations yet"
              />
            ) : (
              <AutomationsTable
                automations={automations}
                basePath={lanePath(LANE)}
                onDelete={setPendingDelete}
              />
            )}
          </ListPage.Body>
        </ListPage>
      </Container>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            {/* Names the consequence that is not obvious. Deleting the automation
                            is the part you asked for; that its history goes with it is the
                            part worth being told before you confirm. */}
            <AlertDialogDescription>
              This automation and its run history will be deleted. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LaneSwitcher lane={LANE} />
    </Box>
  );
};

export default AutomationsList;
export const Component = AutomationsList;
