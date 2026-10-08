import React, { useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import { toast } from 'sonner';
import {
  Badge,
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
import AutomationsHelpCards from '@/automations/components/automations-help-cards';
import { AutomationsTable } from '@/automations/proto/shared/automations-table';
import { lanePath } from '@/automations/proto/shared/lanes';
import { laneShowsTrigger } from '@/automations/proto/shared/capabilities';
import { LaneSwitcher } from '@/automations/proto/shared/lane-switcher';
import { needsStripe } from '@/automations/proto/shared/trigger-config';
import type { ProtoAutomation } from '@/automations/proto/shared/store';
import {
  canPublishAutomation,
  duplicateAutomation,
  setAutomationArchived,
  setAutomationStatus,
  suggestCopyName,
  useProtoAutomations,
  useStripeConnected,
} from '@/automations/proto/shared/store';
import {
  ArchiveAutomationDialog,
  PublishAutomationDialog,
  TurnOffAutomationDialog,
} from './dialogs';
import { getRunData } from '@/automations/proto/shared/mock';
import { NEW_AUTOMATION_ID } from './creation-variant';
import { useVersionLink } from '@/automations/proto/shared/use-version-link';

// PHASE 2 — the automations list, with CRUD.
//
// Toasts on this screen share one format: "Automation" and the past tense of
// exactly what you just did — created, saved, published, updated, archived,
// unarchived, duplicated, turned off. No names, no actions, no second line. The
// one exception is the error toast refusing an incomplete Publish or Update.
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

// Members mid-flow in a row's automation — what Turn off and Archive tell you
// they'll exit (see ./dialogs). Nobody is in progress in one that's off.
const inProgressCount = (entry: ProtoAutomation): number =>
  entry.automation.status === 'active' ? getRunData(entry.automation.id).metrics.in_progress : 0;

const AutomationsList: React.FC = () => {
  const navigate = useNavigate();
  const toVersioned = useVersionLink();
  // Only what this lane could have built — see shared/capabilities. The store is
  // one list shared by every lane, so an automation on a trigger this lane
  // doesn't offer isn't its business to show.
  const automations = useProtoAutomations().filter((entry) =>
    laneShowsTrigger(LANE, entry.trigger),
  );
  // Which slice of the list is on screen. Active is the default because it's the
  // working set — archiving exists so the list can be the automations you're actually
  // running, and opening onto everything you've ever made would undo that.
  const [view, setView] = useState<ViewKey>('active');
  // The row waiting on the archive confirm. Held here rather than per row, so the list
  // has one dialog instead of one behind every menu.
  const [pendingArchive, setPendingArchive] = useState<ProtoAutomation | null>(null);
  // The rows waiting on a lifecycle confirm — same one-dialog-per-list shape as
  // pendingArchive. Two states rather than one with a direction in it, because
  // each opens a different dialog.
  const [pendingPublish, setPendingPublish] = useState<ProtoAutomation | null>(null);
  const [pendingTurnOff, setPendingTurnOff] = useState<ProtoAutomation | null>(null);
  const stripeConnected = useStripeConnected();

  // Creation is DEFERRED — eng confirmed fake-until-first-save is buildable, so
  // this writes nothing: it navigates to the /new sentinel and the detail
  // screen synthesizes a local baseline. The record exists from the first Save
  // or Publish over there; backing out creates nothing, and no toast fires
  // here because "Automation created" has to be true when it says it.
  //
  // This settles a question that went back and forth: an earlier run-through
  // chose create-on-arrival (Beehiiv, Kit and Resend all do), the design
  // review called auto-create the wrong pattern, and for a while both — plus a
  // create-button-on-the-trigger fallback — shipped as a switchable slot. The
  // alternatives live in this branch's history (and the future lane still
  // carries the switch) if the decision reopens.
  const handleCreate = () => {
    navigate(toVersioned(`${lanePath(LANE)}/${NEW_AUTOMATION_ID}`));
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
    // screen. Toast format — see the note at the top of this file.
    toast.success('Automation duplicated');
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
      toast.success('Automation unarchived');
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
      // Only asks when someone would be exited — with nobody in progress,
      // turning off just happens.
      if (inProgressCount(entry) > 0) {
        setPendingTurnOff(entry);
      } else {
        setAutomationStatus(entry.automation.id, 'inactive');
        toast.success('Automation turned off');
      }
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
    toast.success('Automation published');
  };

  const confirmTurnOff = () => {
    if (!pendingTurnOff) {
      return;
    }
    setPendingTurnOff(null);
    setAutomationStatus(pendingTurnOff.automation.id, 'inactive');
    toast.success('Automation turned off');
  };

  const visible = automations.filter(
    (entry) =>
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
                {/* The shipping list's title, Beta badge included — copied
                    verbatim from automations/automations.tsx, as in phase 1. */}
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
                // Descoped for this release: rows open with the name. The
                // lifecycle and GA lanes keep the trigger icon.
                showTriggerIcon={false}
                onArchive={handleArchive}
                onDuplicate={handleDuplicate}
                onToggleStatus={handleToggleStatus}
              />
            )}
            {/* The shipping list's own education and feedback cards — the real
                component, not a copy, so they stay whatever production has. */}
            <AutomationsHelpCards />
          </ListPage.Body>
        </ListPage>
      </Container>

      {/* The delete confirm that used to live here went with the action — see
                setAutomationArchived in shared/store for why the write is still around. */}
      <ArchiveAutomationDialog
        inProgressCount={pendingArchive ? inProgressCount(pendingArchive) : 0}
        open={Boolean(pendingArchive)}
        onConfirm={confirmArchive}
        onOpenChange={() => setPendingArchive(null)}
      />

      {/* The lifecycle confirms, shared with the detail header's buttons. No
                pending spinner here: the list's write is the store alone, with no
                canvas repainting behind the dialog to wait for. */}
      <PublishAutomationDialog
        open={Boolean(pendingPublish)}
        onConfirm={confirmPublish}
        onOpenChange={() => setPendingPublish(null)}
      />
      <TurnOffAutomationDialog
        inProgressCount={pendingTurnOff ? inProgressCount(pendingTurnOff) : 0}
        open={Boolean(pendingTurnOff)}
        onConfirm={confirmTurnOff}
        onOpenChange={() => setPendingTurnOff(null)}
      />

      <LaneSwitcher lane={LANE} />
    </Box>
  );
};

export default AutomationsList;
export const Component = AutomationsList;
