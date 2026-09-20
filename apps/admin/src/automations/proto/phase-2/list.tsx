import React, { useRef, useState } from 'react';
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
import { needsStripe, triggerConfigFor } from '@/automations/proto/shared/trigger-config';
import type { ProtoAutomation } from '@/automations/proto/shared/store';
import {
  blankAutomation,
  canPublishAutomation,
  duplicateAutomation,
  insertAutomation,
  isNameTaken,
  setAutomationArchived,
  setAutomationStatus,
  suggestCopyName,
  updateAutomationDetails,
  useProtoAutomations,
  useStripeConnected,
} from '@/automations/proto/shared/store';
import { ArchiveAutomationDialog } from '@/automations/proto/shared/archive-dialog';
import {
  TurnOffAutomationDialog,
  TurnOnAutomationDialog,
} from '@/automations/proto/shared/lifecycle-dialogs';
import { useProtoVariant } from '@/automations/proto/shared/proto-variants';
import { ProtoVariantsProvider } from '@/automations/proto/shared/proto-variants-provider';
import { CREATION_SLOT, NEW_AUTOMATION_ID } from './creation-variant';
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
  // The automation just created here, hidden from the list until this screen is gone.
  // See handleCreate.
  const creatingId = useRef<string | null>(null);
  // The row being renamed, and the name and description offered for it.
  const [pendingRename, setPendingRename] = useState<ProtoAutomation | null>(null);
  const [renameDraft, setRenameDraft] = useState({ name: '', description: '' });
  // Which creation model is being demoed — see CREATION_SLOT.
  const creationVariant = useProtoVariant(CREATION_SLOT);
  // The rows waiting on a lifecycle confirm — same one-dialog-per-list shape as
  // pendingArchive. Two states rather than one with a direction in it, because
  // each opens a different dialog.
  const [pendingPublish, setPendingPublish] = useState<ProtoAutomation | null>(null);
  const [pendingTurnOff, setPendingTurnOff] = useState<ProtoAutomation | null>(null);
  const stripeConnected = useStripeConnected();

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
  //
  // Unless the site has no Stripe. Then there's only one trigger worth offering,
  // and a picker with one option is a question with one answer — so the canvas
  // opens with "Member signs up" already in place and the first real decision
  // becomes the flow itself. See availableTriggerOptions for the rest of the
  // no-Stripe design.
  const handleCreate = () => {
    // The deferred variants (see CREATION_SLOT) write NOTHING here: they
    // navigate to the /new sentinel and the detail screen synthesizes a local
    // baseline — the record exists from the first commit over there, not from
    // this click. No toast either; "Automation created" has to be true when it
    // fires. Everything below is the arrival variant's create-then-open.
    if (creationVariant !== 'arrival') {
      navigate(toVersioned(`${lanePath(LANE)}/${NEW_AUTOMATION_ID}`));
      return;
    }
    const record = stripeConnected
      ? blankAutomation()
      : { ...blankAutomation(), trigger: triggerConfigFor('member_subscribes') };
    // Held before the write, so the row never draws here.
    //
    // insertAutomation and navigate are both in this handler and React batches state
    // updates — but the store is a useSyncExternalStore, and React flushes those
    // synchronously to avoid tearing. So the list re-rendered WITH the new row before
    // the route change had a chance to land, and you saw it appear for a frame on the
    // screen you were leaving.
    //
    // A ref rather than state for exactly that reason: it's written now, not
    // scheduled, so the forced re-render already reads the new value. Nothing resets
    // it, because this list is on its way out — and if the navigation somehow doesn't
    // happen, one hidden row on a screen you didn't leave is a better failure than a
    // flash on every creation.
    creatingId.current = record.automation.id;
    insertAutomation(record);
    navigate(toVersioned(`${lanePath(LANE)}/${record.automation.id}`));
    // Past tense and no action. It reports something that already happened, and the
    // screen it happened on is the one you're now looking at — there's nowhere for a
    // "View" to take you.
    //
    // Bottom-left, with every other toast in the app, and nothing overriding it. Three
    // positions were tried on this one — top-center over the canvas, `invert` in place,
    // then top-right — and all of them were solving the same thing: the canvas's
    // bottom-left corner holds the zoom controls, so a toast lands on top of them.
    //
    // That's a reason to move the CONTROLS, not the toasts. Ghost puts its help
    // launcher bottom-right and its toasts bottom-left — the two far corners,
    // deliberately opposite — so bottom-left isn't habit, it's reserved. A screen that
    // answers "where do confirmations appear" differently from every other screen is a
    // worse trade than a zoom pill somewhere less conventional.
    //
    // Parked rather than solved: the controls stay where they are for now.
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
    duplicateAutomation(entry.automation, entry.trigger, entry.description, name);
    // The copy appears in the list you're already looking at, at the top, under the
    // name this names. A "View" action was offering a trip to something already on
    // screen.
    toast.success(`“${name}” created`);
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

  // A typed name another automation carries. Same rule as the detail screen's
  // popover (isNameTaken: trimmed, case-insensitive, archived included), shown
  // under the field and holding Save — this dialog HAS a commit button, so the
  // refusal lives on it rather than in a write-through guard.
  const renameNameError =
    pendingRename &&
    renameDraft.name.trim() &&
    isNameTaken(renameDraft.name, pendingRename.automation.id)
      ? 'An automation with this name already exists.'
      : undefined;

  const confirmRename = () => {
    const name = renameDraft.name.trim();
    if (!pendingRename || !name || renameNameError) {
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
    setPendingArchive(null);
    setAutomationArchived(pendingArchive.automation.id, true);
    // Four words. It named the automation and, for a live one, added "and turned off"
    // — accurate, and by then nobody is reading it: the dialog just said both of those
    // things, and the row is visibly gone from the list behind the toast.
    //
    // No Undo either. It was the argument for archiving without a confirm; there IS a
    // confirm now, so the toast was offering to reverse a decision that had already
    // been checked once. Unarchive is in the row's own menu under the Archived view,
    // which is where someone who changes their mind an hour later has to go anyway.
    toast.success('Automation archived');
  };

  // Publish / Turn off from the row menu — the same confirms the detail header
  // raises, so the act costs the same wherever it's started. The writes are the
  // detail screen's own (setAutomationStatus); the one difference is that
  // publishing here has no draft to promote — the list only knows saved records,
  // which is also why canPublishAutomation validates the record rather than a
  // draft.
  const handleToggleStatus = (entry: ProtoAutomation) => {
    if (entry.automation.status === 'active') {
      setPendingTurnOff(entry);
      return;
    }
    setPendingPublish(entry);
  };

  const confirmPublish = () => {
    if (!pendingPublish) {
      return;
    }
    setPendingPublish(null);
    setAutomationStatus(pendingPublish.automation.id, 'active');
    // The same words the detail screen's publish uses — one act, one confirmation.
    toast.success('Automation is live');
  };

  const confirmTurnOff = () => {
    if (!pendingTurnOff) {
      return;
    }
    setPendingTurnOff(null);
    setAutomationStatus(pendingTurnOff.automation.id, 'inactive');
    // No toast, matching the detail screen: the row's badge flips to Off in
    // place, which is the confirmation.
  };

  const visible = automations.filter(
    (entry) =>
      entry.automation.id !== creatingId.current &&
      // No Stripe, no paid workflows — in ANY view, archived included: the list
      // shows what the site can run, and a site that can't take payments can't
      // run these. They aren't deleted; reconnecting Stripe brings every one of
      // them straight back. See availableTriggerOptions for the whole design.
      (stripeConnected || !entry.trigger || !needsStripe(entry.trigger)) &&
      (view === 'all' ? true : view === 'archived' ? entry.archived : !entry.archived),
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
                publishBlocked={(entry) => !canPublishAutomation(entry, stripeConnected)}
                onArchive={handleArchive}
                onDuplicate={handleDuplicate}
                onRename={openRename}
                onToggleStatus={handleToggleStatus}
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
        nameError={renameNameError}
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

      {/* The lifecycle confirms, shared with the detail header's buttons. No
                pending spinner here: the list's write is the store alone, with no
                canvas repainting behind the dialog to wait for. */}
      <TurnOnAutomationDialog
        open={Boolean(pendingPublish)}
        pending={false}
        onConfirm={confirmPublish}
        onOpenChange={() => setPendingPublish(null)}
      />
      <TurnOffAutomationDialog
        open={Boolean(pendingTurnOff)}
        onConfirm={confirmTurnOff}
        onOpenChange={() => setPendingTurnOff(null)}
      />

      <LaneSwitcher lane={LANE} />
    </Box>
  );
};

// Wrapped in the variants provider so the creation slot is switchable from
// this screen's lane menu too — the selection itself lives in localStorage,
// which is how this screen and the detail screen agree on it.
const AutomationsListScreen: React.FC = () => (
  <ProtoVariantsProvider slots={[CREATION_SLOT]}>
    <AutomationsList />
  </ProtoVariantsProvider>
);

export default AutomationsListScreen;
export const Component = AutomationsListScreen;
