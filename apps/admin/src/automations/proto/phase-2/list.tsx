import React, { useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import { toast } from 'sonner';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyIndicator,
} from '@tryghost/shade/components';
import { Box, Container } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { AutomationsTable } from '@/automations/proto/shared/automations-table';
import { lanePath } from '@/automations/proto/shared/lanes';
import { LaneSwitcher } from '@/automations/proto/shared/lane-switcher';
import type { ProtoAutomation } from '@/automations/proto/shared/store';
import {
  blankAutomation,
  duplicateAutomation,
  insertAutomation,
  setAutomationArchived,
  setAutomationStatus,
  suggestCopyName,
  updateAutomationDetails,
  useProtoAutomations,
} from '@/automations/proto/shared/store';
import { ArchiveAutomationDialog } from '@/automations/proto/shared/archive-dialog';
import { DetailsDialog } from './details-dialog';
import { useVersionLink } from '@/automations/proto/shared/use-version-link';

// PHASE 2 — the automations list, with CRUD.
//
// This is the lane where automations can be made and removed. Phase 1's list is
// read-only and stays that way.
const LANE = 'phase-2' as const;

type ViewKey = 'active' | 'archived' | 'all';

// "Active automations", not "Active" — the control sits beside "New automation" with
// no column header or label to say what it filters, so each option has to name the
// noun as well as the slice.
//
// "Active" rather than "Live": live is the on/off status of a single automation, and
// this cuts across that — an active automation can be off. Reusing the word would
// have made "Active automations" look like a status filter and left archived-but-live
// as a state a reader would go looking for.
const VIEWS: { value: ViewKey; label: string }[] = [
  { value: 'active', label: 'Active automations' },
  { value: 'archived', label: 'Archived automations' },
  { value: 'all', label: 'All automations' },
];

const AutomationsList: React.FC = () => {
  const navigate = useNavigate();
  const toVersioned = useVersionLink();
  const automations = useProtoAutomations();
  // Which slice of the list is on screen. Active is the default because it's the
  // working set — archiving exists so the list can be the automations you're actually
  // running, and opening onto everything you've ever made would undo that.
  const [view, setView] = useState<ViewKey>('active');
  // The row waiting on the archive confirm. Held here rather than per row, so the list
  // has one dialog instead of one behind every menu.
  const [pendingArchive, setPendingArchive] = useState<ProtoAutomation | null>(null);
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

  // "Edit details", not "Rename". Rename is the sharper word, and it was wrong: the
  // dialog behind it edits the description as well, so the label promised less than it
  // delivered and anyone looking for the description had no reason to open it.
  //
  // The description belongs in there because it's the line under the name in this very
  // table — the two are what you're organising by, and splitting them across two
  // actions would mean opening one dialog to fix a row and another to finish the job.
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

  // No confirm. Archiving takes nothing away — the automation, its history and its
  // configuration are all still there, one view switch away — so a dialog would be
  // asking you to agree to something that hasn't got a downside. What it does do is
  // stop a live automation, which is why the toast says so rather than just
  // confirming the archive.
  //
  // The undo is the real safety net, and it's the same write in reverse.
  // Unarchiving needs no confirm — putting something back where you can see it has no
  // consequence to warn about. Archiving raises the dialog; this only runs once it's
  // been answered.
  const handleArchive = (entry: ProtoAutomation) => {
    if (entry.archived) {
      setAutomationArchived(entry.automation.id, false);
      toast.success(`“${entry.automation.name}” restored`);
      return;
    }
    setPendingArchive(entry);
  };

  const confirmArchive = () => {
    if (!pendingArchive) {
      return;
    }
    const { id, name, status } = pendingArchive.automation;
    setPendingArchive(null);
    setAutomationArchived(id, true);
    toast.success(
      status === 'active' ? `“${name}” archived and turned off` : `“${name}” archived`,
      {
        action: {
          label: 'Undo',
          // Puts the status back too. Unarchiving on its own always returns an
          // automation OFF, which is right when a publisher asks for it deliberately
          // — but Undo means "as it was", and for a live one that included running.
          onClick: () => {
            setAutomationArchived(id, false);
            setAutomationStatus(id, status);
          },
        },
      },
    );
  };

  const visible = automations.filter((entry) =>
    view === 'all' ? true : view === 'archived' ? entry.archived : !entry.archived,
  );

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
                {/* Left of the primary action, as its qualifier: it says which
                                automations the button is about to add to. Shade's `dropdown`
                                button variant, which draws its own chevron — a Select was the
                                other option and reads as a form field, which this isn't. */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="dropdown">
                      {VIEWS.find((option) => option.value === view)?.label}
                    </Button>
                  </DropdownMenuTrigger>
                  {/* align="start": the trigger is the left half of a two-control group
                                    flush to the page's right edge, so the menu opens under its own
                                    label rather than reaching across the button beside it. */}
                  <DropdownMenuContent align="start">
                    {VIEWS.map((option) => (
                      <DropdownMenuItem key={option.value} onSelect={() => setView(option.value)}>
                        {option.label}
                        {/* Trailing check, Shade's active-option convention. Opacity
                                                    rather than conditional render so the rows keep a
                                                    stable width. */}
                        <LucideIcon.Check
                          className={cn(
                            'ms-auto text-primary',
                            view === option.value ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={handleCreate}>New automation</Button>
              </PageHeader.Actions>
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body>
            {/* Three empty states, because they mean different things. Nothing at all
                            is an invitation and gets the button. An empty ARCHIVE is a report —
                            offering "create an automation" under it would answer a question
                            nobody asked, since a new one wouldn't appear there anyway. An empty
                            Active view with archived automations behind it is the one that
                            needs a way out, and the way out is the filter, not a new record. */}
            {visible.length === 0 ? (
              <EmptyIndicator
                actions={
                  automations.length === 0 ? (
                    <Button onClick={handleCreate}>Create a new automation</Button>
                  ) : undefined
                }
                description={
                  automations.length === 0
                    ? 'Automations you create will show up here.'
                    : view === 'archived'
                      ? 'Archiving an automation takes it off your list without deleting it.'
                      : 'Every automation you have is archived. Switch views to see them.'
                }
                title={
                  automations.length === 0
                    ? 'No automations yet'
                    : view === 'archived'
                      ? 'Nothing archived'
                      : 'No active automations'
                }
              />
            ) : (
              <AutomationsTable
                automations={visible}
                basePath={lanePath(LANE)}
                onArchive={handleArchive}
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
        heading="Automation details"
        open={Boolean(pendingRename)}
        values={renameDraft}
        onChange={setRenameDraft}
        onConfirm={confirmRename}
        onOpenChange={() => setPendingRename(null)}
      />

      {/* The delete confirm that used to live here went with the action — see
                setAutomationArchived in shared/store for why the write is still around. */}
      <ArchiveAutomationDialog
        live={pendingArchive?.automation.status === 'active'}
        name={pendingArchive?.automation.name ?? ''}
        open={Boolean(pendingArchive)}
        onConfirm={confirmArchive}
        onOpenChange={() => setPendingArchive(null)}
      />

      <LaneSwitcher lane={LANE} />
    </Box>
  );
};

export default AutomationsList;
export const Component = AutomationsList;
