import React, { useRef, useState } from 'react';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  EmptyIndicator,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { toast } from 'sonner';

import { useBlocker, useConfirmUnload, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { getRunData } from '@/automations/proto/shared/mock';
import {
  setAutomationArchived,
  saveAutomation,
  setAutomationStatus,
  updateAutomationDetails,
  useProtoAutomation,
} from '@/automations/proto/shared/store';
import { ArchiveAutomationDialog } from '@/automations/proto/shared/archive-dialog';
import { changeSummary } from '@/automations/proto/shared/change-summary';
import { PROTO_EASE } from '@/automations/proto/shared/motion';
import { HEADER_ACTION, HeaderBar } from './header-bar';
import { LeftPanel } from './left-panel';
import type { TriggerConfig } from '@/automations/proto/shared/trigger-config';
import { CANVAS_SLOT_FILL, canvasTheme } from '@/automations/proto/canvas/flow-utils';
import { EditCanvas } from '@/automations/proto/canvas/edit-canvas';
import { FlowCanvas } from '@/automations/proto/canvas/flow-canvas';
import { useVersionLink } from '@/automations/proto/shared/use-version-link';
import { lanePath } from '@/automations/proto/shared/lanes';
import { LaneSwitcher } from '@/automations/proto/shared/lane-switcher';

// EXPLORATION — not scheduled. See shared/lanes for why each lane owns its own
// copy of this screen.
//
// Edits autosave into a draft, so the question becomes which changes are live
// rather than whether they're saved, and the header carries the
// unpublished-changes review. The trigger stays editable. Chrome flattens:
// header and pane sit unbordered on the page and the canvas becomes an inset
// window, so the flow is the only bounded object on screen.
const LANE = 'exploration-2' as const;

type LiveStatus = 'active' | 'inactive';

// Turn-on / turn-off confirmations. Structure and weight come from the shipped
// editor (plain AlertDialog, non-destructive confirm, same shape of sentence);
// the vocabulary is the proto's, and deliberately narrower than what's shipped.
//
// One switch metaphor for the lifecycle — an automation is On or Off, and you
// Turn it on or off — which leaves "publish" to mean exactly one thing: pushing
// edits to an automation that's already on. (Phase 1 says Publish here instead,
// matching the shipping editor, which is why this used to be a prop.)
const TurnOnAutomationDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}> = ({ open, onOpenChange, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Turn on automation?</AlertDialogTitle>
        <AlertDialogDescription>
          Your automation will start running. Any member who meets the trigger will be enrolled
          automatically.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <Button onClick={onConfirm}>Turn on</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const TurnOffAutomationDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}> = ({ open, onOpenChange, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Turn off automation?</AlertDialogTitle>
        <AlertDialogDescription>
          Your automation will no longer run, and any members currently in progress will be removed.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <Button onClick={onConfirm}>Turn off</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// Publishing to an automation that's ON confirms — but only confirms. What happens to
// members already mid-flow is a real question the team still has to settle, and
// offering a choice here would imply we'd answered it. A plain "are you sure"
// marks the moment as deliberate without encoding a decision that doesn't exist
// yet; options go back in when there's something to encode.
const PublishChangesDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}> = ({ open, onOpenChange, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Publish changes</AlertDialogTitle>
        <AlertDialogDescription>
          This automation is on — these changes will take effect immediately.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <Button onClick={onConfirm}>Publish</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/**
 * Float concept. All chrome floats directly on the canvas, the way the post
 * editor floats its own header over the document.
 *
 * Lifecycle: an automation is On or Off, and you Turn it on or off. Editing is
 * never gated on turning it off — edits autosave into a draft, and Publishing is
 * what pushes them to an automation that's already on. "Publish" therefore means
 * exactly one thing here, which is the whole reason the lifecycle uses a switch
 * metaphor instead of spending the same word on both.
 *
 * (An earlier version of this concept made a live automation read-only and used
 * Stop to unlock editing — the product VP wasn't bought into forcing that, so
 * the draft/published split does that job instead.)
 *
 * The canvases live in proto/canvas/ — they were shared with a second concept
 * before it was cut, and stayed separate because the flow itself isn't part of
 * what this screen decides.
 */
const AutomationFloat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toVersioned = useVersionLink();

  // The automation itself comes from the store, so one that was created in this
  // session is as real as a seeded fixture. Runs and metrics stay hand-authored
  // and keyed by id — a created automation has none, which is the empty state
  // `emptyScenarioId` already designs for.
  const record = useProtoAutomation(id);
  const scenario = record
    ? { automation: record.automation, ...getRunData(record.automation.id) }
    : undefined;
  // What Save last committed. The screen diffs against these rather than against
  // anything it tracks itself.
  const savedAutomation = record?.automation;
  const savedTrigger = record?.trigger ?? null;

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Member search. Held by the screen rather than the pane so the pane stays a
  // presentational column — it renders the field and reports typing, and nothing
  // about where the field lives is baked into where the value is kept.
  const [query, setQuery] = useState('');
  // Live status isn't screen state: starting and stopping take effect the moment
  // they're confirmed, so they're written straight to the store rather than
  // waiting on Save with the rest of the edits.
  const liveStatus: LiveStatus = savedAutomation?.status ?? 'inactive';
  const [stopOpen, setStopOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  // Set while the automation is being removed under the screen: the store is
  // external, so deleting re-renders this synchronously and the "not found" read
  // would fire before the route change lands.
  const leaving = useRef(false);
  // No model behind it yet — see the panel. Held here so the choice survives a tab
  // switch, which is enough to tell whether the question belongs in this panel.
  const [allowReentry, setAllowReentry] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  // Edits are held here until Save commits them to the store, which is also why
  // they're the one piece of state that ISN'T persisted: an unsaved draft is
  // defined as the thing you haven't committed, and restoring one a week later
  // would quietly contradict that. `null` means "nothing edited yet" — the saved
  // version is being shown as-is.
  //
  // The screen is keyed by automation id (see AutomationFloatScreen), so this
  // starts empty for each automation rather than needing to be reset.
  const [draft, setDraft] = useState<AutomationDetail | null>(null);
  // Trigger + exit criteria. Separate from `draft` because AutomationDetail carries no
  // trigger config yet — the canvases take it as its own prop. `null` is the
  // just-created state: nothing has been chosen to start this automation, and the
  // canvas shows a picker rather than a flow.
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig | null>(savedTrigger);

  // The trigger stays editable here — nothing is fixed after creation.
  // The canvas is always editable, so hiding the pane is the user's call.
  const [paneCollapsed, setPaneCollapsed] = useState(false);

  // What's running vs what's being edited. Derived up here, before the early
  // return, because the leave guards below need to know whether anything differs
  // and hooks can't run conditionally.
  const publishedAutomation = savedAutomation;
  const activeDraft = draft ?? publishedAutomation;

  // The diff is computed, not tracked. This used to be a `dirty` boolean flipped
  // by the first edit and left true until publish or discard — so typing a
  // character and deleting it left the screen insisting on changes that no longer
  // existed, and offering to publish or discard nothing. Comparing the draft
  // against what's published means an edit that cancels itself out stops
  // counting, and the controls disappear on their own.
  //
  // changeSummary is therefore the single definition of "something differs":
  // whatever becomes editable has to be represented there, or it won't register
  // as a change anywhere on this screen.
  const changes =
    publishedAutomation && activeDraft
      ? changeSummary({
          published: publishedAutomation,
          draft: activeDraft,
          publishedTrigger: savedTrigger,
          draftTrigger: triggerConfig,
        })
      : [];
  const hasChanges = changes.length > 0;

  // Both the commit button and the leave guard hang off hasChanges — the draft
  // differing from what's stored — and nothing else.
  //
  // They used to hang off `hasChanges && liveStatus === 'active'`, on the reasoning
  // that only a RUNNING automation has a live version for edits to diverge from. True
  // as far as it goes, and wrong for both of these: a stopped automation's edits are
  // just as uncommitted, and are just as lost on leaving. What that gate actually did
  // was disable the commit button permanently while the automation was off, and turn
  // off the leave guard along with it.
  //
  // Leaving. The premise under the old wiring was that edits autosave, so nothing was
  // at risk and the browser prompt could be reserved for a save in flight. They don't:
  // the draft is React state, deliberately not persisted (see `draft`), so a refresh
  // or a closed tab loses it exactly as an in-app navigation would. Both guards watch
  // the same condition now, which is also what phase 1 and 2 do.
  useConfirmUnload(hasChanges);
  const navigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChanges && currentLocation.pathname !== nextLocation.pathname,
  );

  const goBack = () => navigate(toVersioned(lanePath(LANE)));

  // Discarding a draft has no home in this lane at the moment: it lived in the
  // header's ⋯, and the ⋯ has gone now that Delete is in Settings (and Duplicate
  // is in the automations table — see the settings panel).
  // Parked rather than solved — it's a real action and it'll need somewhere, but
  // inventing a place for it wasn't the point of removing the menu.
  // Archive, and leave. Same act and same wording as phase 2's — behind the shared
  // confirm, and Undo puts the status back as well as unarchiving.
  const handleArchive = () => {
    setArchiveOpen(false);
    if (!id || !savedAutomation) {
      return;
    }
    // Flagged before the navigate: the store is external, so this re-renders the
    // screen synchronously and the route change lands after it.
    leaving.current = true;
    setAutomationArchived(id, true);
    navigate(toVersioned(lanePath(LANE)));
    // Four words, and no Undo — see the same toast on the list for why.
    toast.success('Automation archived');
  };

  if (!scenario || !record || !id) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
        <EmptyIndicator title="Automation not found" />
        <Button variant="outline" onClick={goBack}>
          Back to automations
        </Button>
      </div>
    );
  }

  const { automation } = scenario;
  // Same two values as above, narrowed. The versions used for the diff are derived
  // before the not-found guard (hooks can't run conditionally), so TypeScript
  // still sees them as possibly-undefined; past the guard they can't be.
  const publishedFlow = publishedAutomation ?? automation;
  const draftFlow = activeDraft ?? automation;
  const selectedRun = selectedMemberId
    ? (scenario.runs.find((r) => r.id === selectedMemberId) ?? null)
    : null;
  // Editing is never gated on stopping the automation — you can edit a live one
  // freely; publishing is where the consequences get decided. There's no edit
  // mode: the canvas is editable unless a member's run is in focus, which is the
  // one thing that genuinely wants a read-only view. The crossfade between the
  // two canvases is what handles that.
  const showEditCanvas = !selectedRun;
  // Nothing can go live without something to start it. This is the only gate the
  // create flow adds: an automation with no trigger isn't half-configured, it's
  // an automation that cannot run.
  const canGoLive = triggerConfig !== null;
  // What's running (read canvas) vs what's being edited (edit canvas).

  // No autosave tick. There used to be one — a save-state flag flipped for 700ms on
  // every edit — but nothing on this screen ever displayed it, and its only real
  // consumer was the browser-unload guard, which it wired to "a save is in flight"
  // instead of "there are unsaved changes". A simulation of a behaviour this lane
  // doesn't have, quietly deciding a guard: removed rather than left to mislead the
  // next person. Whether anything differs is read from the draft itself.
  const handleDraftChange = (next: AutomationDetail) => {
    setDraft(next);
  };

  const handleTriggerConfigChange = (next: TriggerConfig) => {
    setTriggerConfig(next);
  };

  // Start — take a stopped automation live. Read mode only now, so there's no
  // edit state to settle here. No confirm dialog: going live is low-friction and
  // reversible via Stop, and a blocking modal would interrupt the flow. All the
  // friction lives on Stop and on publishing to something already running.
  // Whatever's in the draft becomes the running version.
  const promoteDraft = () => {
    saveAutomation(id, draftFlow, triggerConfig);
    setDraft(null);
  };

  const handleStart = () => {
    // Starting takes the automation live as it currently stands, so the draft
    // becomes the published version in the same move — there's no separate
    // "publish" step to remember for something that was never running.
    setStartOpen(false);
    promoteDraft();
    setAutomationStatus(id, 'active');
    // Title only — the start-confirmation dialog already explained what
    // turning it on means, so the toast just confirms it happened.
    toast.success('Automation is live');
  };

  const publishChanges = () => {
    setPublishOpen(false);
    promoteDraft();
    // The same press does two different things depending on the automation, and the
    // toast is the only thing that says which: live, the edits reached the running
    // version; stopped, they were written down and nothing started.
    toast.success(liveStatus === 'active' ? 'Changes published' : 'Changes saved');
  };

  // A stopped automation has nobody mid-flow, so there's nothing to confirm and
  // it publishes straight away. A live one confirms first.
  const handlePublishClick = () => {
    if (liveStatus === 'inactive') {
      publishChanges();
      return;
    }
    setPublishOpen(true);
  };

  // Discard reverts to what's published. An undo toast rather than a confirm
  // dialog, matching the shipped header's discard.

  // The switch never flips itself. Both directions open their confirm, and the
  // status only moves when that's answered — a control that changes on click and
  // then changes back is worse than one that waits.
  const handleStatusToggle = (next: boolean) => {
    if (next) {
      setStartOpen(true);
      return;
    }
    setStopOpen(true);
  };

  const handleStop = () => {
    setStopOpen(false);
    setAutomationStatus(id, 'inactive');
  };

  // What's in the draft that isn't live. Future only — phase 1 never shows a
  // diff, since you just made the edits and haven't left the screen.
  // The header's actions, which is where the two releases diverge most visibly.
  //
  // Phase 1 mirrors the shipping editor exactly (see automations/components/
  // automation-header.tsx): off, Save sits alongside Publish, so committing work
  // and going live stay separate decisions; on, Publish changes reports its own
  // clean state by becoming a disabled "Published" rather than handing that job
  // to a second control. That last part answers the review feedback directly —
  // the button announces the state by what it offers, so nothing has to stand
  // next to it saying "unpublished changes".
  //
  // Future keeps autosave's shape: nothing to save, so the only questions are
  // what's live and what's in the draft.
  //
  // No save indicator in either. Autosave is meant to be unremarkable, and
  // flickering "Saving…" on every keystroke draws the eye to plumbing rather
  // than to anything the publisher can act on.
  // The header's actions.
  //
  // At most one visible action at a time, which is what four earlier attempts
  // kept failing at. Everything that isn't the moment's decision moves into the
  // ⋯: lifecycle, management, and undoing a draft. Publishing is the only thing
  // that earns the primary slot, and only while there's something to publish.
  //
  // Stopped, the primary is Turn on — the one thing you'd do with a stopped
  // automation — and a draft can't exist to compete with it, since edits to
  // something that isn't running have no live version to diverge from.
  //
  // No save indicator. Autosave is meant to be unremarkable, and flickering
  // "Saving…" on every keystroke draws the eye to plumbing rather than to
  // anything the publisher can act on.
  const chromeActions = (
    <>
      {/* The commit button, borderless and always there — the post editor's header,
                which solves the same problem this one does and solves it with plain text.

                "Update" only once the automation is live: the word means "push these
                edits to the thing that's already running", which is exactly what it means
                in the editor, and it's a promise a stopped automation can't keep. Off,
                there's no live version for edits to diverge from, so the same press is
                just "Save" — it writes the draft down and nothing starts.

                Always there rather than appearing when there's something to commit. A
                control that comes and goes makes the row re-lay itself at the moment
                you're deciding whether to press it, and its absence is a worse way of
                saying "nothing to commit" than the disabled state is: absent could mean
                anything, disabled means the thing exists and has nothing to do. */}
      <Button
        className={HEADER_ACTION}
        disabled={!hasChanges}
        variant="ghost"
        onClick={handlePublishClick}
      >
        {liveStatus === 'active' ? 'Update' : 'Save'}
      </Button>
    </>
  );

  return (
    // One column: the header row, then the canvas-and-rail row under it.
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background"
      data-testid="float-detail"
    >
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* The canvas and the header above it, as one column.

                    The header used to span the whole screen, above both regions. Inside the
                    canvas column it ends where the canvas ends, so what it holds — the
                    automation's name, Update, the switch — lines up with the flow those
                    things act on, and the pane gets its own top row instead of starting
                    below a bar that was never about it. */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Always here. This lane keeps the post editor's shape, where the header
                      is a fixed white bar and only the right rail comes and goes — the
                      disappearing-chrome idea is what Exploration 1 is for, and having both
                      lanes do it would waste one of them.
                      
                      Which takes a fair amount out: no height collapse, no fading contents,
                      and no floating pills standing in for a header that isn't there. */}
          <HeaderBar
            actions={chromeActions}
            canGoLive={canGoLive}
            reserveToggle={paneCollapsed}
            status={liveStatus}
            title={automation.name}
            onBack={goBack}
            onStatusChange={handleStatusToggle}
          />
          {/* Canvas first in the row, so the pane sits to its RIGHT — this lane's whole
                  difference from Exploration 1 so far.
                
                  It reads with the grain of the screen: the flow is the subject and starts
                  where you start reading, and what reports on it sits alongside rather than
                  in front of it. It also puts the pane on the same side as the analytics
                  sheet that opens for an email's numbers, so nothing about an automation
                  arrives from the left.
                
                  Canvas fills the remaining viewport (bounded, not full-bleed), so the flow
                  centres within its own region — no left-inset hack needed. Same fill as
                  REACT_FLOW_THEME paints inside it, so the region and the flow's own
                  background can't disagree at the edges. */}
          <div
            className={cn(
              'relative min-w-0 flex-1 overflow-hidden',
              // This region owns the canvas palette. Everything inside it — both
              // canvases and the dashed insert buttons — reads the fill, dots and
              // edge colour from here by inheritance, so the two releases can look
              // completely different without either canvas knowing which one it is.
              CANVAS_SLOT_FILL,
              canvasTheme('exploration', Boolean(selectedRun)),
              // Full bleed. No inset, no radius, no border, nothing to animate: this
              // region simply IS the page under the header, the way the post editor's
              // body is, and its edges are the window's edges.
              //
              // Exploration 1 does the opposite — a rounded window inset 24px from the
              // page, which reads as an object you can maximise. That bet needs chrome
              // that gets out of its way; this one needs chrome that stays put. Running
              // both is how we find out which the flow actually wants.
              //
              // Worth knowing what full bleed costs in DARK: the flow fill and the page
              // background are the same token there by design, so the only thing marking
              // where the canvas begins is the header's rule and the rail's.
            )}
          >
            {/* The header's action half, floating, on the same 24px inset as everything
                      else on this canvas. Its own pill rather than joined to the left one —
                      they were at opposite ends of the header and should stay at opposite ends
                      of the screen; sliding them together would be a different layout, not a
                      hidden one. */}
            {/* Both canvases stay mounted and crossfade on mode change. No remount
                      means the incoming flow is already centred — no first-frame node flash.
                      The inactive one is opacity-0 + pointer-events-none so clicks fall to
                      the active canvas beneath/above it. */}
            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-150',
                showEditCanvas ? 'pointer-events-none opacity-0' : 'opacity-100',
              )}
            >
              <FlowCanvas
                automation={publishedFlow}
                selectedRun={selectedRun}
                triggerConfig={savedTrigger ?? undefined}
              />
            </div>
            {/* The one thing that still floats over this canvas. Everything else that
                used to live up here moved into the persistent header — this can't,
                because it isn't about the automation, it's about the run you happen to
                have open, and it comes and goes while the header stays put.

                top-6 left-6 is the same 24px inset the header's own padding uses, so it
                sits on the header's left edge rather than near it.

                Who you're looking at, and the way out, as one control: clicking the
                member's name closes their run. This replaced a bare X, which said
                nothing about whose run it was — you could see you were inside something
                without being told what, and the only thing naming the member was a
                highlighted row in a pane you might have collapsed. The close icon leads,
                because what the control DOES should be read before whose name it carries.

                aria-label rather than the bare name, since "Marcus Chen" doesn't say what
                pressing it does; it contains the visible text, so the label-in-name rule
                still holds. */}
            {selectedRun && !showEditCanvas && (
              <div className="absolute top-6 left-6 z-20 rounded-lg border bg-surface-elevated p-1 shadow-xs">
                <Button
                  aria-label={`Close ${selectedRun.member.name}'s run`}
                  className="h-9"
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedMemberId(null)}
                >
                  <LucideIcon.X strokeWidth={2} />
                  {selectedRun.member.name}
                </Button>
              </div>
            )}

            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-150',
                showEditCanvas ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              {/* The same email card as every other lane. This lane used to opt
                  into an inline-analytics variant (stats as a bar on the card);
                  that concept was deleted when the card was consolidated — the
                  right-hand sheet is how analytics open everywhere. */}
              <EditCanvas
                draft={draftFlow}
                triggerConfig={triggerConfig}
                onChange={handleDraftChange}
                onTriggerConfigChange={handleTriggerConfigChange}
              />
            </div>
          </div>
        </div>
        {/* Right-hand pane, docked flush to the edge. On entering edit it slides off the
                left (negative margin collapses its flex footprint to 0) and the canvas
                grows leftward to fill. Always mounted so the transition can animate; the
                canvas's ResizeObserver re-centres the flow as it grows. Clearing the
                title overlay is left to each panel variant — one keeps its content
                below it, another puts controls on the same baseline as it. */}
        {/* --surface-elevated, matching the right-hand analytics sheet: both are
                content panels flanking the canvas, so they're the same step of the
                ladder. This was on the --sidebar-* family, which is for the app's
              global nav — it happened to match in dark and diverged in light. */}
        <aside
          className={cn(
            // Collapses by WIDTH, not by sliding out on a negative margin. Both
            // animate the same 480px, but a slide takes the pane's contents with it,
            // which reads as the pane escaping rather than closing. Narrowing holds
            // every child exactly where it is and lets overflow-hidden wipe them as the
            // canvas edge advances, so nothing moves that isn't supposed to.
            //
            // On this side the wipe runs the other way — the contents are clipped from
            // the right while the pane's left edge travels — which is why the child below
            // stays pinned to its full width.
            //
            // This only works because the child below is pinned to w-[480px]: left
            // to itself the content would reflow as the pane narrowed, wrapping the
            // title and crushing the table for the length of the animation.
            'relative flex shrink-0 flex-col overflow-hidden transition-[width]',
            `duration-300 ${PROTO_EASE} motion-reduce:transition-none`,
            // Page content on the page's own background, not a raised panel — but with
            // a rule down its leading edge, running the full height of the viewport.
            //
            // The rule is doing real work here. The header is on --surface-elevated and
            // this is on --background, which in light are close enough that the two read
            // as one continuous white band across the top of the screen — the header
            // appearing to extend over the pane, with its own border-b stopping in the
            // middle of nowhere. Full height rather than starting under the header,
            // because the boundary it marks is the whole column split, and a rule that
            // began 84px down would be describing the pane's contents instead.
            //
            // border-l, not border-r: the pane's edge is the one facing the canvas, and
            // on this side that's its left. It goes with the width — at w-0 a rule would
            // still paint, a stray hairline down the right edge of the screen.
            'bg-background',
            paneCollapsed ? 'w-0 border-l-0' : 'w-[480px] border-l',
          )}
        >
          {/* onCollapse is future only — that release puts the toggle on the
                    pane, beside its title. Phase 1 drives the same state from the
                    header bar, so its pane doesn't carry a control of its own. */}
          {/* Pinned to the pane's full width so it never reflows while the
                    aside narrows around it — see the note above. */}
          <div className="flex min-h-0 w-[480px] flex-1 flex-col">
            <LeftPanel
              query={query}
              scenario={scenario}
              selectedMemberId={selectedMemberId}
              settings={{
                name: automation.name,
                description: record?.description ?? '',
                // Written straight through, like the status is. This lane has no
                // Save between you and the store for these — they're properties of
                // the automation rather than of the flow, and the flow is the thing
                // Publish commits.
                onDetailsChange: ({ name, description }) =>
                  updateAutomationDetails(id, name, description),
                allowReentry,
                onAllowReentryChange: setAllowReentry,
                onArchive: () => setArchiveOpen(true),
              }}
              onQueryChange={setQuery}
              onSelectMember={setSelectedMemberId}
            />
          </div>
        </aside>
      </div>

      {/* Lifecycle confirms — turning the automation on, and taking it off. */}
      <TurnOnAutomationDialog
        open={startOpen}
        onConfirm={handleStart}
        onOpenChange={setStartOpen}
      />
      <TurnOffAutomationDialog open={stopOpen} onConfirm={handleStop} onOpenChange={setStopOpen} />
      {/* Opened from Settings, not the header — see the panel. */}
      <ArchiveAutomationDialog
        live={liveStatus === 'active'}
        name={automation.name}
        open={archiveOpen}
        onConfirm={handleArchive}
        onOpenChange={setArchiveOpen}
      />

      {/* Publish — a deliberate confirm when the automation is already live. */}
      <PublishChangesDialog
        open={publishOpen}
        onConfirm={publishChanges}
        onOpenChange={setPublishOpen}
      />

      {/* Leaving the automation with changes that are saved but not running.
                Not a data-loss warning — the draft survives — so it offers to leave
                rather than to discard. */}
      <AlertDialog
        open={navigationBlocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open) {
            navigationBlocker.reset?.();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes will be lost if you leave this automation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* This said "your changes are saved, but they won't affect this automation
                        until you publish them", and dropped the red on the strength of it. That
                        described a screen that autosaves; this one doesn't. Work is genuinely
                        lost here, so it now says so in the shipping editor's own words and
                        colours the confirm destructive — the same dialog phase 1 and 2 raise,
                        which is what it should have been all along. */}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <Button variant="destructive" onClick={() => navigationBlocker.proceed?.()}>
              Discard changes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* The pane toggle, pinned to the screen's top-right and never anywhere else.
                
                It belonged to the header, which now ends where the canvas ends — so it would
                have sat at the canvas's right edge with the switch, in the middle of the
                screen. And it belonged to the floating pill in hidden mode, which meant two
                of them in two places depending on state.
                
                Above both regions instead: it's the one control that acts on the LAYOUT
                rather than on the automation, so it doesn't belong to either half of it. And
                it's the same corner in every state, which is the point of a control you
                reach for when you can't find anything else.
                
                top-6 right-6 is the 24px the header pads by, so it sits on the header's own
                line while there is one — and only while there is one. Expanded, that corner
                belongs to the HUD pill, which takes the toggle in as its last item rather
                than having it hover over the top. */}
      <div
        // Pinned to the screen's corner, and there in both states. It used to fade out
        // as the interface went and hand off to a copy of itself in a floating pill;
        // there's no hiding gesture in this lane to hand off to, so it simply stays —
        // one button, never moving, that opens and closes the rail beneath it.
        className="absolute top-6 right-6 z-40"
      >
        <Button
          aria-label={paneCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          aria-pressed={paneCollapsed}
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => setPaneCollapsed(!paneCollapsed)}
        >
          <LucideIcon.PanelRight strokeWidth={2} />
        </Button>
      </div>

      {/* Prototype-only: which lane this is, and the way to the others. */}
      <LaneSwitcher lane={LANE} />
    </div>
  );
};

// Provider wraps the whole screen (not just the panel) so future slots — node
// styles, header treatments — can register without moving anything.
const AutomationFloatScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // Keyed by id so every piece of unsaved state — the draft, the trigger being
  // configured, the member in focus — belongs to one automation and starts clean
  // on the next. Without it, React reuses the instance across a route change and
  // the previous automation's draft would follow you to the new one.
  return <AutomationFloat key={id} />;
};

export default AutomationFloatScreen;
export const Component = AutomationFloatScreen;
