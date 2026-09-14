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
import type { ProtoAutomation } from '@/automations/proto/shared/store';
import {
  blankAutomation,
  deleteAutomation,
  duplicateAutomation,
  insertAutomation,
  suggestCopyName,
  updateAutomationDetails,
  useProtoAutomations,
} from '@/automations/proto/shared/store';
import { DetailsDialog } from './details-dialog';
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
  // The row being renamed, and the name and description offered for it.
  const [pendingRename, setPendingRename] = useState<ProtoAutomation | null>(null);
  const [renameDraft, setRenameDraft] = useState({ name: '', description: '' });

  // Makes the automation, then opens it. It used to do the opposite — navigate to a
  // `/new` sentinel id, hold the whole thing locally, and write the record on the
  // first Save.
  //
  // A team run-through didn't accept that model. Nothing on screen said the
  // automation didn't exist yet, and Save meant two different things depending on
  // whether it was the first press ("bring this into being") or any later one
  // ("commit these edits"). Beehiiv, Kit and Resend all create on arrival, and the
  // reason is that it's the only version where the screen can tell you the truth
  // about what it is.
  //
  // So: create, land on a real id, and say so. The toast is the visible half; the
  // half that matters is that it's true when it fires.
  //
  // No name-it-first dialog. The automation is named for you ("New automation",
  // then numbered), and the first real decision — what starts it — is the trigger
  // list waiting on the canvas.
  const handleCreate = () => {
    const record = blankAutomation();
    insertAutomation(record);
    navigate(toVersioned(`${lanePath(LANE)}/${record.automation.id}`));
    // Past tense and no action. It reports something that already happened, and the
    // screen it happened on is the one you're now looking at — there's nowhere for a
    // "View" to take you. Duplicate's toast has one because that copy is elsewhere.
    toast.success('Automation created');
  };

  // Instant. It used to open the naming dialog first, which made a two-press act out
  // of the one thing in this list you'd want to do repeatedly — building the next
  // tier's flow from the last one's. The name it offered was the name you'd accept,
  // so the dialog was a confirmation step wearing a form.
  //
  // What makes instant safe is that the copy is inert: it's off, it isn't running,
  // and Rename is directly above this in the same menu. The posts list duplicates
  // exactly this way.
  //
  // Copies the SAVED record — there's no draft on this screen to prefer.
  const handleDuplicate = (entry: ProtoAutomation) => {
    const name = suggestCopyName(entry.automation.name);
    const copyId = duplicateAutomation(entry.automation, entry.trigger, entry.description, name);
    toast.success(`“${name}” created`, {
      action: {
        label: 'View',
        onClick: () => navigate(toVersioned(`${lanePath(LANE)}/${copyId}`)),
      },
    });
  };

  // Rename, not "Edit details". The menu is a list of verbs and this is what you came
  // to do; "Edit details" names a place rather than an act, and leaves you guessing
  // which details. The description comes along because it's the line under the name
  // in this very table — the two are what you're organising by, and splitting them
  // across two actions would mean opening one dialog to fix a row and another to
  // finish the job.
  const openRename = (entry: ProtoAutomation) => {
    setRenameDraft({ name: entry.automation.name, description: entry.description });
    setPendingRename(entry);
  };

  const confirmRename = () => {
    const name = renameDraft.name.trim();
    if (!pendingRename || !name) {
      return;
    }
    updateAutomationDetails(pendingRename.automation.id, name, renameDraft.description.trim());
    setPendingRename(null);
    toast.success('Automation updated');
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
                onDuplicate={handleDuplicate}
                onRename={openRename}
              />
            )}
          </ListPage.Body>
        </ListPage>
      </Container>

      {/* The same dialog the detail screen's Edit details opens, so naming an
                automation is one act asked one way wherever you do it. */}
      <DetailsDialog
        blurb="Only you and your team can see this — members never do."
        confirmLabel="Save"
        heading="Rename automation"
        open={Boolean(pendingRename)}
        values={renameDraft}
        onChange={setRenameDraft}
        onConfirm={confirmRename}
        onOpenChange={() => setPendingRename(null)}
      />

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
