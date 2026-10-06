import React, { useEffect, useRef, useState } from 'react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { toast } from 'sonner';

import { useBlocker, useConfirmUnload, useNavigate, useParams } from '@tryghost/admin-x-framework';
import type { ProtoAutomationDetail } from '@/automations/proto/shared/update-member';
import { getRunData } from '@/automations/proto/shared/mock';
import {
  type ProtoAutomation,
  blankAutomation,
  insertAutomation,
  isNameTaken,
  setAutomationArchived,
  saveAutomation,
  setAutomationStatus,
  useProtoAutomation,
  useStripeConnected,
} from '@/automations/proto/shared/store';
import { NEW_AUTOMATION_ID } from './creation-variant';
import {
  ArchiveAutomationDialog,
  PublishAutomationDialog,
  TurnOffAutomationDialog,
  UpdateAutomationDialog,
} from './dialogs';
import { changeSummary } from '@/automations/proto/shared/change-summary';
import { HeaderBar } from './header-bar';
import { PROTO_EASE } from '@/automations/proto/shared/motion';
import { type PaneTab, SidePanel } from './side-panel';
import {
  type TriggerConfig,
  exitSentence,
  needsStripe,
  tiersUnanswered,
  triggerConfigFor,
} from '@/automations/proto/shared/trigger-config';
import {
  CANVAS_HUD_BUTTON,
  CANVAS_SLOT_FILL,
  canvasTheme,
  lexicalHasContent,
} from '@/automations/proto/canvas/flow-utils';
import { EditCanvas } from '@/automations/proto/canvas/edit-canvas';
import { FlowCanvas } from '@/automations/proto/canvas/flow-canvas';
import { useVersionLink } from '@/automations/proto/shared/use-version-link';
import { lanePath } from '@/automations/proto/shared/lanes';
import { LaneSwitcher } from '@/automations/proto/shared/lane-switcher';

// PHASE 2 — per-tier automations. See shared/lanes for why each lane owns its
// own copy of this screen.
//
// Starts as a copy of the phase-1 screen and diverges from there: this lane adds
// automation CRUD (create from the list, a trigger chosen on an empty canvas)
// and is where per-tier triggers and explicit exit conditions land. Phase 1's
// copy is not to be edited for any of that — the whole reason these are separate
// files is that its engineer needs it to hold still.
const LANE = 'phase-2' as const;

type LiveStatus = 'active' | 'inactive';

// The turn-on / turn-off / publish-changes confirms live in
// shared/lifecycle-dialogs now — the list's row menus raise the same acts, and
// the same act asked from two screens has to ask with the same words.
//
// How long the prototype pretends publishing takes. The real editor puts a spinner
// in this button while the request is in flight (see automations/editor.tsx), and
// the choreography around it is worth prototyping even though nothing here is
// actually waiting on a server: it's the moment the screen changes underneath, so
// it's the moment worth getting right.
const PUBLISH_LATENCY_MS = 550;

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

  const stripeConnected = useStripeConnected();
  // Creation is DEFERRED — the decided model, confirmed buildable by eng after
  // a stretch as a three-way switchable slot (create-on-arrival, this, and a
  // create-button fallback; the alternatives live in this branch's history and
  // the future lane still carries the switch). /new is the sentinel: nothing
  // exists until the first Save or Publish, and backing out creates nothing.
  // The costs the old removal note listed — a record shadowing the store, a
  // branch in promoteDraft, a key held across the /new → /:id navigation — are
  // knowingly paid; that list is this implementation's checklist.
  const isNew = id === NEW_AUTOMATION_ID;
  // The synthesized baseline: a blank minted once per mount, carrying its REAL
  // id (the URL says /new until the first commit swaps it out). It stands in
  // for the saved record, so everything downstream — the diff, the details
  // popover, the leave guard — works unmodified against it. A Stripe-less site
  // lands with the free trigger already placed; it goes on the BASELINE so
  // arriving and leaving untouched registers no changes.
  const newBase = useRef<ProtoAutomation | null>(null);
  if (isNew && newBase.current === null) {
    newBase.current = {
      ...blankAutomation(),
      trigger: !stripeConnected ? triggerConfigFor('member_subscribes') : null,
    };
  }
  const record = useProtoAutomation(id) ?? (isNew ? (newBase.current ?? undefined) : undefined);
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
  // Members mid-flow right now — what Turn off, Update and Archive tell you
  // they'll affect (see ./dialogs). The fixture's in-progress figure while live;
  // an automation that's off has nobody in progress.
  const inProgressCount = liveStatus === 'active' ? (scenario?.metrics.in_progress ?? 0) : 0;
  const [stopOpen, setStopOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  // Whether a publish is in flight — see runPublish, below the not-found guard.
  const [publishing, setPublishing] = useState(false);
  // A blocked attempt to publish makes the canvas show its whole hand. The
  // canvas grants a just-added card a grace period before it wears its warning
  // (see graceStepId there), but pressing Publish IS full validation — the
  // moment someone asks "can this run?", every reason it can't has to be on
  // screen, grace included. Bumping the signal ends any grace; the canvas owns
  // what that reveals.
  const [revealSignal, setRevealSignal] = useState(0);
  const revealWarnings = () => setRevealSignal((s) => s + 1);
  // The Publish button's blocked popover — the answer to pressing Publish while
  // the automation can't go live. One piece of state serves both lifecycle
  // states' primaries; only one of them is ever rendered.
  const [publishBlocked, setPublishBlocked] = useState(false);
  // Closing it on a press anywhere else has to be done by hand for the canvas.
  // Radix dismisses on a bubble-phase pointerdown at the document, and React
  // Flow's pan handler (d3-zoom) stops that event before it gets there — so a
  // press on the canvas, which is most of the screen, never reached it. Capture
  // runs ahead of the canvas. The popover's own content and the button that
  // raised it are left alone: the button decides for itself on its click.
  useEffect(() => {
    if (!publishBlocked) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest?.('[data-publish-blocked]')) {
        return;
      }
      setPublishBlocked(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [publishBlocked]);
  // Set when the screen is deliberately navigating away — Delete, and the first
  // Save of a new automation, which swaps /new for a real id.
  //
  // Two things downstream have to know. The "not found" state, which is otherwise
  // the correct read of an automation that no longer exists. And the leave guard,
  // which would otherwise ask whether to discard unsaved edits to the thing you
  // just deleted — or, on a first save, treat the automation you just saved as
  // unsaved work, because the blank it's diffed against is still the baseline
  // until the remount.
  //
  // A ref rather than state because both are read during the same render that
  // removes or replaces the automation, and a setState wouldn't have landed yet.
  const leaving = useRef(false);
  // Name and description, edited in their own dialog. Two layers of held state:
  // `settingsDraft` is the dialog's raw field text, and `detailsDraft` is what
  // that text APPLIES as — the same values trimmed and blank-name-guarded,
  // waiting on the global Save with the rest of the draft. Two layers because
  // the name field must be free to read "" mid-edit while the applied name
  // never goes blank. This screen has ONE commit: the dialog writes through to
  // the draft as you type and carries a single Close — buttons that confirmed
  // (Cancel/Done, and Save before that) read as the task being finished and
  // written, when the real commit is the header's Save. `null` means untouched —
  // the saved name and description are what's being shown.
  // Which of the side panel's tabs is showing. Settings used to be a sheet with
  // its own open state; it's a tab now (see side-panel).
  //
  // Opens on Performance when there's something to report — the automation is
  // live, or has runs — and on Settings otherwise: a new or never-run automation
  // has a chart of zeroes to show and a name to give, and the name is the one
  // that's actionable.
  const [paneTab, setPaneTab] = useState<PaneTab>(() =>
    liveStatus === 'active' || (scenario?.runs.length ?? 0) > 0 ? 'performance' : 'settings',
  );
  // Seeded with the saved details, since Settings can be the tab the panel opens
  // on; switching back to it reseeds from what the header shows (see
  // handlePaneTabChange).
  const [settingsDraft, setSettingsDraft] = useState(() => ({
    name: savedAutomation?.name ?? '',
    description: record?.description ?? '',
  }));
  const [detailsDraft, setDetailsDraft] = useState<{ name: string; description: string } | null>(
    null,
  );
  // The copy's name and description, offered before it exists.
  // Edits are held here until Save commits them to the store, which is also why
  // they're the one piece of state that ISN'T persisted: an unsaved draft is
  // defined as the thing you haven't committed, and restoring one a week later
  // would quietly contradict that. `null` means "nothing edited yet" — the saved
  // version is being shown as-is.
  //
  // The screen is keyed by automation id (see AutomationFloatScreen), so this
  // starts empty for each automation rather than needing to be reset.
  const [draft, setDraft] = useState<ProtoAutomationDetail | null>(null);
  // Trigger + exit criteria. Separate from `draft` because AutomationDetail carries
  // no trigger config yet — the canvases take it as its own prop. `null` is the
  // just-created state: nothing has been chosen to start this automation, and the
  // trigger node asks for one rather than showing a flow.
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig | null>(savedTrigger);
  // The canvas is always editable, so hiding the pane is the user's call.
  //
  // The pane follows the automation's lifecycle: open when it's running, closed
  // when it isn't.
  //
  // A stopped automation is one you're building or have retired, and the work is
  // on the canvas either way — opening onto three zeroes and an empty table puts
  // the answer to a question nobody asked in front of the thing they came for. A
  // running one is being watched, and its numbers are the reason to open it.
  //
  // Status rather than "does it have runs": an automation that's live but hasn't
  // enrolled anyone yet still wants its pane open, because the empty state is
  // exactly the thing worth seeing then — it says where the numbers will appear.
  // This is an ARRIVAL rule, and the only one: publishing no longer opens the pane
  // (see handleStart). Opening an automation that's live shows its numbers; what you
  // do with the pane after that is yours for the rest of the session.
  //
  // Stopping does NOT close it again. Someone turning an automation off is very
  // often turning it off BECAUSE of what the numbers say, and hiding them at that
  // exact moment would be the app arguing with them.
  const [paneCollapsed, setPaneCollapsed] = useState(() => liveStatus !== 'active');
  // Whether the pane is allowed to animate yet.
  //
  // Its opening state is settled before the screen renders — the store is
  // synchronous, so a running automation's pane is open on the very first pass. It
  // should therefore simply BE open, not animate into being open, and opening an
  // automation that was already on flashed exactly that: the pane wiping in from
  // zero as the page arrived.
  //
  // Turning the transition on one paint later means the width it mounts with is the
  // width it draws, while every change after that — publishing, the toggle — still
  // animates. Cheaper and more reliable than working out which of the mount's style
  // recalculations was firing the transition.
  const [paneAnimated, setPaneAnimated] = useState(false);
  useEffect(() => {
    setPaneAnimated(true);
  }, []);

  // What's running vs what's being edited. Derived up here, before the early
  // return, because the leave guards below need to know whether anything differs
  // and hooks can't run conditionally.
  const publishedAutomation = savedAutomation;
  const activeDraft = draft ?? publishedAutomation;

  // The diff is computed, not tracked. A `dirty` boolean flipped by the first edit
  // and left true until publish or discard meant typing a character and deleting it
  // left the screen insisting on changes that no longer existed. Comparing the draft
  // against what's published means an edit that cancels itself out stops counting,
  // and the controls disappear on their own.
  //
  // changeSummary is therefore the single definition of "something differs":
  // whatever becomes editable has to be represented there, or it won't register as a
  // change anywhere on this screen.
  // What the details dialog last handed over, against what's saved. The draft's
  // OWN name field is deliberately not the source here — it's a snapshot taken
  // whenever the canvas last changed, so it can be stale; detailsDraft is the
  // only place a rename lives until Save commits it.
  const savedDetails = {
    name: savedAutomation?.name ?? '',
    description: record?.description ?? '',
  };
  const draftDetails = detailsDraft ?? savedDetails;
  const changes =
    publishedAutomation && activeDraft
      ? changeSummary({
          published: publishedAutomation,
          draft: activeDraft,
          publishedTrigger: savedTrigger,
          draftTrigger: triggerConfig,
          details: { published: savedDetails, draft: draftDetails },
        })
      : [];
  // Name and description count as unsaved work again. They didn't for a while —
  // Rename wrote through to the store the moment the dialog confirmed — but that
  // gave this screen two commits under two buttons both called Save, and the
  // dialog's was the one people pressed thinking they'd saved the automation.
  // Now the dialog only hands its values to the draft, and the global Save is
  // the single commit — so an unsaved rename warns on leave like any other edit.
  const hasChanges = changes.length > 0;

  // The id the first commit just wrote, so the /new → /:id swap it navigates
  // isn't mistaken for leaving. A ref for the same reason `leaving` is — it's
  // read by the blocker in the same breath as the write — but unlike leaving
  // it never needs resetting: navigating to the automation you just created is
  // never a departure worth guarding.
  const createdId = useRef<string | null>(null);

  // Edits are held, not written, so any difference is unsaved work that leaving
  // would destroy — in either lifecycle state, since a stopped automation's edits
  // are just as unsaved as a running one's.
  useConfirmUnload(hasChanges);
  const navigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !leaving.current &&
      !(createdId.current !== null && nextLocation.pathname.endsWith(`/${createdId.current}`)) &&
      hasChanges &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  const goBack = () => navigate(toVersioned(lanePath(LANE)));

  if (!scenario || !record || !id) {
    // Mid-delete: the automation is gone from the store and the route change is
    // already in flight, so this render is a single frame between the two. It
    // used to paint "Automation not found", which reads as a failure — you did
    // something deliberate and the app answered with an error. Nothing at all,
    // for one frame, then the list.
    if (leaving.current) {
      return null;
    }
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
  // What actually gets committed, which is the flow draft with the CURRENT name put
  // back on it.
  //
  // A draft is a snapshot of the whole AutomationDetail, taken whenever the canvas
  // last changed — so it carries whatever the automation was called at that moment.
  // The name isn't edited on the canvas though; it's edited in Settings, on its own
  // path. Add a step, then rename, then save, and the snapshot's stale name went
  // straight over the rename.
  //
  // draftDetails is the authority on the name: the saved one until the dialog
  // hands over a rename, and the pending rename after — which is also what the
  // header shows, so what you read is what Save writes.
  const flowToCommit: ProtoAutomationDetail = { ...draftFlow, name: draftDetails.name };
  const selectedRun = selectedMemberId
    ? (scenario.runs.find((r) => r.id === selectedMemberId) ?? null)
    : null;
  // Editing is never gated on stopping the automation — you can edit a live one
  // freely; publishing is where the consequences get decided. There's no edit
  // mode: the canvas is editable unless a member's run is in focus, which is the
  // one thing that genuinely wants a read-only view. The crossfade between the
  // two canvases is what handles that.
  const showEditCanvas = !selectedRun;
  // This automation depends on payments the site can't take.
  //
  // Reachable in one way only now: it was built while Stripe WAS connected, and
  // Stripe has since gone. The no-Stripe design hides the paid trigger from
  // both pickers and takes paid workflows off the list (see
  // availableTriggerOptions for the reversal — an earlier version hid nothing
  // and explained instead), so this warning can't be provoked by building
  // something new. It stays because hiding can't answer the disconnect case:
  // an automation that exists has to say why it won't publish.
  const stripeMissing = !stripeConnected && triggerConfig !== null && needsStripe(triggerConfig);

  // A blank email in the draft that would be committed — no subject, or no
  // message written (the same lexical test the card's empty state uses).
  // Validated on the DRAFT, not on what the canvas is currently warning about:
  // the canvas grants a just-added card a grace period before it wears its
  // warning, and grace is a display nicety — it must never mean a blank email
  // slips through a publish.
  const blankEmails = draftFlow.actions.some(
    (action) =>
      action.type === 'send_email' &&
      (!action.data.email_subject.trim() || !lexicalHasContent(action.data.email_lexical)),
  );
  // A tiered trigger whose tiers question is open — "Select paid tiers" chosen
  // with nothing named, the field showing its placeholder. Same split as
  // blankEmails: the canvas grace-gates the gold on the card, this validates
  // the fact itself (via the shared predicate, so every validator agrees on
  // what unanswered means).
  const tiersOpen = triggerConfig !== null && tiersUnanswered(triggerConfig);

  // Nothing can go live without something to start it, without the payments it
  // depends on, with an email that can't be sent, or with a trigger whose
  // audience is unanswered. An automation with no trigger isn't
  // half-configured, it's an automation that cannot run — and neither is one
  // waiting on Stripe, carrying a blank email, or listening for tiers nobody
  // has named.
  const canGoLive = triggerConfig !== null && !stripeMissing && !blankEmails && !tiersOpen;
  const paneHidden = paneCollapsed;
  // What's running (read canvas) vs what's being edited (edit canvas).

  // Nothing is written until Save or Publish, so an edit only has to be recorded.
  // Whether anything actually differs is read back off the draft.
  const handleDraftChange = (next: ProtoAutomationDetail) => setDraft(next);

  // Choosing a trigger doesn't rename the automation. It used to — a new one was
  // named after whatever started it — but that put the header's title and the whole
  // canvas in motion on the same click, in two different regions, and the rename was
  // the half nobody was looking at. A new automation is "New automation", numbered,
  // from creation until someone names it themselves.
  const handleTriggerConfigChange = (next: TriggerConfig) => setTriggerConfig(next);

  // Start — take a stopped automation live. Read mode only now, so there's no
  // edit state to settle here. No confirm dialog: going live is low-friction and
  // reversible via Stop, and a blocking modal would interrupt the flow. All the
  // friction lives on Stop and on publishing to something already running.
  // Whatever's in the draft becomes the running version.
  // Save commits the draft. One path — there is no first-save-creates case any more,
  // which is what this function was mostly made of: an insert, a replace-navigate onto
  // the new id, and two pieces of creating-only state to clear afterwards.
  const promoteDraft = (status?: LiveStatus) => {
    // The first commit of a /new automation is an INSERT — the record comes
    // into being here, whole: flow, trigger, details and status in one write,
    // then the URL swaps to the real id (replace, so Back doesn't return to a
    // /new that would synthesize a second blank). The screen key holds across
    // that swap — see AutomationFloatScreen.
    if (isNew) {
      insertAutomation({
        automation: { ...flowToCommit, status: status ?? 'inactive' },
        description: detailsDraft?.description ?? record?.description ?? '',
        trigger: triggerConfig,
      });
      setDraft(null);
      setDetailsDraft(null);
      createdId.current = flowToCommit.id;
      navigate(toVersioned(`${lanePath(LANE)}/${flowToCommit.id}`), { replace: true });
      return;
    }
    // The name rides flowToCommit; the description has no field on
    // AutomationDetail, so it travels beside it. undefined when the dialog was
    // never confirmed — the store keeps what it has.
    saveAutomation(id, flowToCommit, triggerConfig, detailsDraft?.description);
    if (status) {
      setAutomationStatus(id, status);
    }
    setDraft(null);
    setDetailsDraft(null);
  };

  // Publishing runs behind the dialog rather than after it.
  //
  // The button spins while the work happens — the real editor's behaviour, since a
  // publish is a request — and the dialog only closes once the screen behind it is
  // in its final state. That ordering is the point: whatever changes on publish
  // (the record appearing in the store, /new becoming a real route, the pane
  // opening) happens under cover, and what's revealed when the dialog goes is a
  // settled screen rather than one still catching up.
  const runPublish = (work: () => void, close: () => void) => {
    setPublishing(true);
    window.setTimeout(() => {
      work();
      setPublishing(false);
      // A frame later, so the work above has painted behind the dialog before the
      // dialog stops covering it.
      requestAnimationFrame(close);
    }, PUBLISH_LATENCY_MS);
  };

  const handleStart = () => {
    runPublish(
      () => {
        // Starting takes the automation live as it currently stands, so the draft
        // becomes the published version in the same move — there's no separate
        // "publish" step to remember for something that was never running.
        promoteDraft('active');
        // The pane does NOT open here.
        //
        // It used to, on the argument that the pane tracks the lifecycle and this is
        // the lifecycle changing — and that someone could otherwise create, build and
        // publish an automation without ever learning this screen has analytics. Both
        // still true. What they were buying was a 480px panel sliding in at the same
        // moment the dialog lifts, the canvas recentres around its new width, the
        // status badge flips and a toast arrives, and the team's read was that too
        // much happens at once to follow any of it.
        //
        // So the pane stays where the reader left it. Publishing is about the flow;
        // what the pane holds doesn't exist yet at the moment you press it, and the
        // toggle is 24px from where their eyes already are.
        //
        // The arrival rule is untouched: open this automation again and the pane is
        // open, because it's live (see paneCollapsed). Which reads as a rule rather
        // than an inconsistency — on arrival the pane follows the lifecycle, and
        // within a session it's yours.
        //
        // Title only — the start-confirmation dialog already explained what
        // turning it on means, so the toast just confirms it happened.
        toast.success('Automation published');
      },
      () => setStartOpen(false),
    );
  };

  const publishChanges = () => {
    runPublish(
      () => {
        promoteDraft();
        // "Updated", matching the button that asked for it. Toast format —
        // see the list screen's note.
        toast.success('Automation updated');
      },
      () => setPublishOpen(false),
    );
  };

  // Phase 1 only, and only while the automation is off: commit the edits without
  // taking them live. Same promotion as publishing — with nothing running, the
  // difference between the two is entirely whether liveStatus moves.
  const handleSave = () => {
    // Read before promoteDraft navigates the sentinel away: the first save is
    // the creation, and the toast has to say the thing that actually happened.
    const created = isNew;
    promoteDraft();
    toast.success(created ? 'Automation created' : 'Automation saved');
  };

  // Publish, while off: take the automation live. It confirms first (the
  // "Publish automation?" dialog), and a draft that fails validation is blocked
  // at the press — a popover on the button, and the canvas showing every warning
  // it holds.
  const handlePublishAttempt = () => {
    if (!canGoLive) {
      // The refusal is a popover on the button that was pressed — an error
      // toast was tried and sat too far away, bottom-left — and the canvas
      // reveals every highlight it holds, grace periods included.
      revealWarnings();
      setPublishBlocked(true);
      return;
    }
    setStartOpen(true);
  };

  // Publish changes, while live: the edits take effect the moment they land, so
  // the same validation gate applies before the confirm. (Save, while off,
  // stays ungated — a draft is allowed to be unfinished; publishing is where it
  // has to hold up.)
  const handlePublishChangesClick = () => {
    if (!canGoLive) {
      // The refusal is a popover on the button that was pressed — an error
      // toast was tried and sat too far away, bottom-left — and the canvas
      // reveals every highlight it holds, grace periods included.
      revealWarnings();
      setPublishBlocked(true);
      return;
    }
    setPublishOpen(true);
  };

  // Duplicate is NOT on this screen. It lives in the automations table, and only
  // there.
  //
  // It used to be here, in the menu below, and it copied what was on screen — the
  // draft, unsaved edits included. Nobody reading the menu could tell: with explicit
  // save the screen holds two versions of the automation at once, and "Duplicate" names
  // neither of them. A team run-through hit this immediately.
  //
  // The fix isn't better wording, or asking you to save first — that makes Duplicate
  // interrogate you about automation A in order to create automation B, and it's
  // coercive when not saving was deliberate. The fix is that Duplicate needs ONE
  // unambiguous subject, and the list is where it has one. It's a list-level verb
  // anyway: you duplicate to get a starting point for something new, which is a thought
  // you have while surveying what you've got, not mid-edit on one of them. Posts work
  // the same way — duplicated from the posts list, never from inside the editor.
  //
  // Delete stays. Nothing ambiguous about removing the whole thing, draft and all.

  // Whether the field text names another automation. Live per keystroke: the
  // guard below reads it to keep a colliding name off the draft, and the
  // Settings tab debounces what it SAYS about it (see side-panel).
  const nameCollides = isNameTaken(settingsDraft.name, id);

  // Seeded on the way IN from what the screen is currently showing — the pending
  // details if they've been edited this session, the saved ones otherwise — so
  // the field never shows a name the header doesn't. That's also what makes
  // abandoning a blanked or colliding name safe: coming back shows the name that
  // actually applied.
  const handlePaneTabChange = (next: PaneTab) => {
    if (next === 'settings' && paneTab !== 'settings') {
      setSettingsDraft(draftDetails);
    }
    setPaneTab(next);
  };

  // Leaving Settings — another tab, or the panel closing — is just putting it
  // away: never blocked, nothing committed, and no toast. A taken name is said
  // by the field's own error state while you're there; there used to be a toast
  // on the way out as well, retired when the field moved into this panel.
  const togglePane = () => setPaneCollapsed(!paneCollapsed);

  // Typing writes through: the field text lands on the details draft as it
  // changes, the header retitles live, and the global Save is the one commit.
  // Two values don't write through — a blank name (an automation with no name
  // is unfindable in a list) and one that names another automation (two rows
  // with one name is the confusion isNameTaken exists to prevent). In both the
  // draft keeps the last real name while the field is free to hold the bad
  // value mid-edit; close it that way and the previous name stands.
  const handleDetailsChange = (next: { name: string; description: string }) => {
    setSettingsDraft(next);
    const name = next.name.trim();
    setDetailsDraft((prev) => ({
      name: name && !isNameTaken(name, id) ? name : (prev ?? savedDetails).name,
      description: next.description.trim(),
    }));
  };

  // Archive, and leave. The automation is out of the working list, so staying on it
  // would put you on a screen you can no longer reach from the list you just returned
  // it to — and the list is where the undo is.
  //
  // Behind a confirm, like Turn off is — see shared/archive-dialog for why a
  // reversible action still asks.
  const handleArchive = () => {
    setArchiveOpen(false);
    // Flagged before the navigate for the same reason Delete needed it: the store is
    // external, so archiving re-renders this screen synchronously and the route change
    // lands after it. The screen filters archived automations out of nothing, but the
    // leave guard would otherwise fire on the way out.
    leaving.current = true;
    setAutomationArchived(id, true);
    navigate(toVersioned(lanePath(LANE)));
    // Four words, and no Undo — see the same toast on the list for why.
    toast.success('Automation archived');
  };

  const handleStop = () => {
    setStopOpen(false);
    setAutomationStatus(id, 'inactive');
    toast.success('Automation turned off');
  };

  // Turning off only asks when someone would be exited: with members in
  // progress, the dialog says how many; with none, it just happens.
  const handleTurnOffClick = () => {
    if (inProgressCount > 0) {
      setStopOpen(true);
      return;
    }
    handleStop();
  };

  // The header's actions — phase 1's per-state pair, restored after the
  // single-ghost-button-plus-switch arrangement (see header-bar.tsx for the
  // switch's story). Off: Save commits the draft without going live and Publish
  // takes it live, so committing work and going live stay separate decisions —
  // the shipping editor's split. Live: Turn off stops it, and Publish changes —
  // one label in both states, disabled when there's nothing to push. Phase 1
  // swaps the clean state's label to "Published"; here the disable alone says
  // "nothing to do", and the word stays what pressing it would mean.
  //
  // One deviation from phase 1, kept from the switch era: Publish is never
  // disabled for validity. Phase 2 has states phase 1 can't reach — no trigger
  // chosen, tiers unanswered — and a greyed-out Publish is a dead end: it says
  // no without saying why. Pressing it while blocked answers at the point of
  // the press — a popover on the button says why, and the canvas shows every
  // warning it holds, grace periods included.
  //
  // No save indicator. Flickering "Saving…" on every keystroke draws the eye to
  // plumbing rather than to anything the publisher can act on.

  // The shipping header's validation popover (components/automation-header,
  // withValidationFeedback), markup and message verbatim: opened by a refused
  // press rather than by the trigger, dismissed by Escape or an outside click,
  // and gone on its own once the automation can go live.
  const withPublishBlocked = (button: React.ReactElement) => (
    <Popover
      open={publishBlocked && !canGoLive}
      onOpenChange={(open) => {
        if (!open) {
          setPublishBlocked(false);
        }
      }}
    >
      <PopoverTrigger asChild data-publish-blocked>
        {button}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72"
        data-publish-blocked
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Text role="status" size="md">
          Fix all issues to publish this automation.
        </Text>
      </PopoverContent>
    </Popover>
  );

  const chromeActions =
    liveStatus === 'inactive' ? (
      <>
        {/* Nothing to save until something changes. Publish stays available
                either way — an unedited draft is still publishable, which is how
                the shipping editor behaves. */}
        <Button disabled={!hasChanges} variant="outline" onClick={handleSave}>
          Save
        </Button>
        {withPublishBlocked(<Button onClick={handlePublishAttempt}>Publish</Button>)}
      </>
    ) : (
      <>
        <Button variant="outline" onClick={handleTurnOffClick}>
          Turn off
        </Button>
        {/* "Update", the post editor's word for pushing edits to something
            that's already live — and the right-panel concept's. */}
        {withPublishBlocked(
          <Button disabled={!hasChanges} onClick={handlePublishChangesClick}>
            Update
          </Button>,
        )}
      </>
    );

  return (
    // flex-col in both variants: the docked header is a row above the pane and
    // canvas, and with no header the same column collapses to just that row.
    <div
      className="fixed inset-0 z-50 flex overflow-hidden bg-background"
      data-testid="float-detail"
    >
      {/* The header never carries the pane control in either release — its left
                is the back arrow, the title and its status, full stop. */}
      {/* No notice here any more. The Stripe warning was a Banner centred in this
                header — the explanation on the same row as the Publish it blocks —
                and it moved onto the trigger card itself (see triggerWarning on the
                edit canvas): the card is where the cause lives, and a message at the
                top of the screen was pointing at a card the reader hadn't found yet.
                The Publish button still refuses via canGoLive (popover at the press),
                so the header's half of the story is the control refusing, and the
                card's half is why. */}
      {/* Everything but the side panel, as one column: the header and the
          canvas beneath it. The panel is a full-height column to its right, so
          opening it narrows this one — the header's actions and the canvas slide
          over together, the way the right-panel concept's chrome moves. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar
          actions={chromeActions}
          paneOpen={!paneCollapsed}
          status={liveStatus}
          // The pending name, not the saved one: a rename shows here the moment
          // it's typed in the Settings tab, the way a canvas edit shows on the
          // canvas — on screen now, committed by Save.
          title={draftDetails.name}
          onBack={goBack}
        />
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* Canvas fills the remaining viewport (bounded, not full-bleed), so the flow
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
              canvasTheme('phase-1', Boolean(selectedRun)),
              // Docked chrome: the canvas is one of three abutting surfaces, so it
              // fills its column flush — no inset, no radius. The inset-window
              // treatment belongs to the exploration lane.
            )}
          >
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
            {/* One top-left cluster, not two things at the same coordinates: the
                    pane toggle (future's — phase 1's is anchored to the row below) and
                    the member button can both be present at once, so they sit in a row
                    and neither has to know about the other.

                    left-6 with the button pulled back 8px, and top-4: the horizontal
                    inset is the 24px every column on this screen uses, and the vertical
                    one is 16px because that is where the row beneath the header starts
                    — the pane's strip is pt-4, and the invisible twin of the pane toggle
                    that the "Performance" title aligns against sits at 16. This cluster
                    was at top-6, which put it 8px below the toggle standing right beside
                    it; both are size-9, so their centres missed by 8 and the corner read
                    as broken.

                    16 rather than 24 costs the symmetry with the zoom controls, which
                    take CANVAS_HUD_INSET (24) in the opposite corner. Worth it here: this
                    canvas is flush against the header and pane, so its top-left corner
                    belongs to that horizontal band and has to line up with it. The
                    exploration lane's canvas is a bounded window instead, inset from the
                    page — nothing to line up with, so its cluster keeps the symmetric
                    24. */}
            {selectedRun && !showEditCanvas && (
              <div className="absolute top-4 left-6 z-20">
                <Inline align="center" gap="sm">
                  {/* Who you're looking at, and the way out, as one control:
                                clicking the member's name closes their run. This replaced
                                a bare X in the canvas's top-right, which said nothing
                                about whose run it was — you could see you were inside
                                something without being told what, and the only thing
                                naming the member was a highlighted row in a pane you
                                might have collapsed.

                                Same outline-on-surface-elevated chrome as the button
                                beside it, so the two read as one cluster of canvas
                                controls rather than two kinds of thing. The close icon
                                leads, because what the control DOES should be read
                                before whose name it carries.

                                aria-label rather than the bare name, since "Marcus Chen"
                                doesn't say what pressing it does; it contains the visible
                                text, so the label-in-name rule still holds. */}
                  {selectedRun && !showEditCanvas && (
                    <Button
                      aria-label={`Close ${selectedRun.member.name}'s run`}
                      // Same chrome as the maximise toggle beside it, so
                      // the two read as one set of canvas controls.
                      className={CANVAS_HUD_BUTTON}
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedMemberId(null)}
                    >
                      <LucideIcon.X strokeWidth={2} />
                      {selectedRun.member.name}
                    </Button>
                  )}
                </Inline>
              </div>
            )}

            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-150',
                showEditCanvas ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <EditCanvas
                // Building vs watching: while the automation is off the inserts
                // stay on screen — choosing a trigger otherwise landed on one
                // card, one line and no visible next move. Live, they go back to
                // hover; the flow is being read then, not assembled. (Email
                // analytics are NOT lifecycle-gated — every email card reports
                // from the moment it exists, zeros included; see the canvas's
                // ZERO_EMAIL_STATS.)
                alwaysShowInserts={liveStatus === 'inactive'}
                // An email's report expands in place on its card: the header's
                // analytics button opens the clicked links under the numbers. (It was a
                // modal before — the side panel owns the right edge, where the
                // other lanes' sheet slides in — and the modal didn't land.)
                analyticsSurface="inline"
                // The messaging spec's wording: the trigger's settings reset, and
                // the rest of the flow is untouched.
                changeTriggerDescription="Your settings on this trigger will be reset. All other steps in this automation will remain unchanged."
                draft={draftFlow}
                // The exit sentence lives in Settings now, under Exit conditions.
                exitsOnTriggerCard={false}
                // Faults show on the fields that have them, in Shade's own
                // invalid state, with the card's border in a muted version of
                // the same red — rather than a gold alert in the card's header.
                faultDisplay="field"
                // Which triggers this screen may offer — see shared/capabilities.
                lane={LANE}
                revealWarningsSignal={revealSignal}
                // Type-gated: a saved trigger of a different type answered a
                // different question, so its tiers don't keep archived rows
                // offered here.
                savedTierIds={
                  savedTrigger && savedTrigger.type === triggerConfig?.type
                    ? savedTrigger.tierIds
                    : []
                }
                triggerConfig={triggerConfig}
                // The Stripe problem, worn by the card that has it. The message
                // states the fix rather than the failure — one sentence, the same
                // one the header Banner carried: "members", not "subscribers",
                // Ghost's noun throughout.
                triggerWarning={
                  stripeMissing
                    ? { message: 'Connect Stripe to publish automations for paid members.' }
                    : undefined
                }
                // A refused Publish also brings the first fault into view when
                // it's off screen.
                revealPansToFirstFault
                onChange={handleDraftChange}
                onTriggerConfigChange={handleTriggerConfigChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* The side panel, full height at the right edge. Collapsing narrows it
              to nothing, and the column to its left — header and canvas — grows
              to fill; the canvas's ResizeObserver re-centres the flow as it does.
              Always mounted so the transition can animate. */}
      {/* --surface-elevated, matching the right-hand analytics sheet: both are
              content panels flanking the canvas, so they're the same step of the
              ladder. This was on the --sidebar-* family, which is for the app's
              global nav — it happened to match in dark and diverged in light. */}
      <aside
        className={cn(
          // Collapses by WIDTH, not by sliding out on a negative margin. Both
          // animate the same 480px, but a slide takes the pane's contents with
          // it — the title and its controls travelled left and passed under the
          // toggle on their way out, which read as the pane escaping rather than
          // closing. Narrowing holds every child exactly where it is and lets
          // overflow-hidden wipe them from the right as the canvas edge advances,
          // so nothing moves that isn't supposed to.
          //
          // This only works because the child below is pinned to w-[480px]: left
          // to itself the content would reflow as the pane narrowed, wrapping the
          // title and crushing the table for the length of the animation. It's
          // held to the RIGHT edge (items-end), so the panel's left edge sweeps
          // over it rather than the contents sliding.
          'relative flex shrink-0 flex-col items-end overflow-hidden',
          // 420ms on the proto's shared curve, matching the canvas's creation
          // sequence: publishing opens this pane, and the two shouldn't look like
          // separate animations that happened to fire together. At the old
          // 150ms/ease-out a 480px slab arrived faster than the eye could follow it,
          // which is what made it read as a jump rather than a reveal.
          paneAnimated &&
            `transition-[width] duration-420 ${PROTO_EASE} motion-reduce:transition-none`,
          // A content panel flanking the canvas, so it takes the same step of
          // the ladder as the right-hand analytics sheet.
          'border-l border-border-default bg-surface-elevated',
          // border-l goes with the width: at w-0 a rule would still paint, a
          // stray hairline down the right of the screen.
          paneHidden ? 'w-0 border-l-0' : 'w-[480px]',
        )}
      >
        {/* onCollapse is future only — that release puts the toggle on the
                  pane, beside its title. Phase 1 drives the same state from the
                  header bar, so its pane doesn't carry a control of its own. */}
        {/* Pinned to the pane's full width so it never reflows while the
                  aside narrows around it — see the note above. */}
        {/* The contents fade rather than being wiped in by the widening edge.
                  Width alone made the panel's own text appear to slide out from under
                  the canvas, because everything inside was arriving sideways at 480px
                  of travel while standing still relative to its own column.
                  
                  Trailing the width on the way in, leading it on the way out: a reveal
                  wants the space to exist before anything occupies it, and a dismissal
                  wants the contents gone before the space closes over them. */}
        <div
          className={cn(
            'flex min-h-0 w-[480px] flex-1 flex-col',
            paneAnimated && 'transition-opacity motion-reduce:transition-none',
            paneHidden
              ? 'opacity-0 duration-100'
              : 'opacity-100 [transition-delay:140ms] duration-300',
          )}
        >
          <SidePanel
            query={query}
            scenario={scenario}
            selectedMemberId={selectedMemberId}
            settings={{
              values: settingsDraft,
              onChange: handleDetailsChange,
              nameTaken: nameCollides,
              // The draft's trigger, so the sentence follows a trigger change
              // before it's saved, as the card's did.
              exits: triggerConfig ? exitSentence(triggerConfig) : null,
            }}
            tab={paneTab}
            onQueryChange={setQuery}
            onSelectMember={setSelectedMemberId}
            onTabChange={handlePaneTabChange}
          />
        </div>
      </aside>

      {/* The side panel's toggle, pinned to the screen's top-right corner and
          nowhere else — the right-panel concept's arrangement. It's the one
          control that acts on the layout rather than the automation, so it's the
          one that holds still while the layout moves under it: closed, it ends
          the header's row (the header reserves its footprint); open, it ends the
          panel's top row (the panel reserves it too).

          32px (size-8), the height of every other control in both rows, and
          top-4 centres that in their 64px. At Shade's size="icon" 36 it sat
          2px high: the button drew at 32 inside a 36px box, top-aligned. A flex
          wrapper so there's no line box around it to add height either. */}
      <div className="absolute top-4 right-6 z-40 flex">
        <Button
          aria-label={paneCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          aria-pressed={!paneCollapsed}
          className="size-8"
          size="icon"
          type="button"
          variant="ghost"
          onClick={togglePane}
        >
          <LucideIcon.PanelRight strokeWidth={2} />
        </Button>
      </div>

      {/* Lifecycle confirms — turning the automation on, and taking it off. */}
      <PublishAutomationDialog
        open={startOpen}
        pending={publishing}
        onConfirm={handleStart}
        onOpenChange={setStartOpen}
      />
      <TurnOffAutomationDialog
        inProgressCount={inProgressCount}
        open={stopOpen}
        onConfirm={handleStop}
        onOpenChange={setStopOpen}
      />

      {/* The details editor is the side panel's Settings tab — before that a
                sheet, a popover from the title, and a dialog with three footers
                (see side-panel and this file's history). */}

      {/* Where the delete confirm used to be. If Delete ever returns to the UI, its
                dialog is worth writing again rather than reaching for "this can't be
                undone" — that sentence is true of every delete dialog ever written and
                tells nobody anything; the number of members mid-flow is what actually
                decides it. */}
      <ArchiveAutomationDialog
        inProgressCount={inProgressCount}
        open={archiveOpen}
        onConfirm={handleArchive}
        onOpenChange={setArchiveOpen}
      />

      {/* Publish — a deliberate confirm when the automation is already live. */}
      <UpdateAutomationDialog
        inProgressCount={inProgressCount}
        open={publishOpen}
        pending={publishing}
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
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes will be lost if you leave without saving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Work is genuinely lost here, so the dialog says so in the shipping
                        editor's own words and colours the confirm destructive. */}
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <Button variant="destructive" onClick={() => navigationBlocker.proceed?.()}>
              Leave
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prototype-only: which lane this is, and the way to the others. */}
      <LaneSwitcher lane={LANE} />
    </div>
  );
};

// Provider wraps the whole screen (not just the panel) so the creation slot —
// and any future slots — register for the lane switcher inside.
const AutomationFloatScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // Keyed so every piece of unsaved state — the draft, the trigger being
  // configured, the member in focus — belongs to one automation and starts clean on
  // the next. Without it, React reuses the instance across a route change and the
  // previous automation's draft would follow you to the new one.
  //
  // With ONE exception: the first Save of a /new automation swaps the URL to
  // its real id — the same automation gaining an id, not a change of subject.
  // Letting the key change there tore the screen down and rebuilt it
  // mid-publish, header, pane and both React Flow canvases reassembling in
  // full view: the first-publish flash. So the key holds across exactly that
  // transition and follows the id on every other.
  const current = id ?? NEW_AUTOMATION_ID;
  const [screenKey, setScreenKey] = useState(current);
  const [prevRouteId, setPrevRouteId] = useState(current);
  if (prevRouteId !== current) {
    setPrevRouteId(current);
    if (prevRouteId !== NEW_AUTOMATION_ID) {
      setScreenKey(current);
    }
  }
  return <AutomationFloat key={screenKey} />;
};

export default AutomationFloatScreen;
export const Component = AutomationFloatScreen;
