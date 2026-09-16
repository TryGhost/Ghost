import React, { useEffect, useRef, useState } from 'react';
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
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { toast } from 'sonner';

import { useBlocker, useConfirmUnload, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { getRunData } from '@/automations/proto/shared/mock';
import {
  setAutomationArchived,
  saveAutomation,
  setAutomationStatus,
  useProtoAutomation,
  useStripeConnected,
} from '@/automations/proto/shared/store';
import { ArchiveAutomationDialog } from '@/automations/proto/shared/archive-dialog';
import {
  PublishChangesDialog,
  TurnOffAutomationDialog,
  TurnOnAutomationDialog,
} from '@/automations/proto/shared/lifecycle-dialogs';
import { changeSummary } from '@/automations/proto/shared/change-summary';
import { HeaderBar } from './header-bar';
import { PROTO_EASE } from '@/automations/proto/shared/motion';
import { LeftPanel } from './left-panel';
import {
  type TriggerConfig,
  hasTiers,
  needsStripe,
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
import { DetailsDialog } from './details-dialog';

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
  // Every automation this screen opens exists. There is no half-made one.
  //
  // There used to be: `new` was a sentinel id (Ghost's tag detail still works that
  // way for /tags/new), the screen held a blank record locally, and the first Save
  // wrote it. That meant a second record shadowing the stored one, a second name and
  // description held beside it, a branch in promoteDraft, and a key the screen
  // wrapper had to hold across the /new → /:id navigation so publishing didn't tear
  // the canvas down mid-write. All of it existed to describe a state the list now
  // never produces — it creates the automation before sending you here.
  const record = useProtoAutomation(id) ?? undefined;
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
  const [publishBlockedOpen, setPublishBlockedOpen] = useState(false);
  const stripeConnected = useStripeConnected();
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({ name: '', description: '' });
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
  const [draft, setDraft] = useState<AutomationDetail | null>(null);
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

  // Edits are held, not written, so any difference is unsaved work that leaving
  // would destroy — in either lifecycle state, since a stopped automation's edits
  // are just as unsaved as a running one's.
  useConfirmUnload(hasChanges);
  const navigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !leaving.current && hasChanges && currentLocation.pathname !== nextLocation.pathname,
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
  const flowToCommit: AutomationDetail = { ...draftFlow, name: draftDetails.name };
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
  // The first decision, and the only thing on screen while it's open. Chrome that
  // acts on an automation — its name, its status, Save, Publish — is chrome for
  // something that doesn't exist yet, so the header stands down until there's an
  // automation to act on. What's left is the canvas, one centred card, and the way
  // back.

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
  // A tiered trigger with no tiers chosen — the "Choose tiers" placeholder
  // still showing. Same split as blankEmails: the canvas grace-gates the gold
  // on the card, this validates the fact itself.
  const tiersUnanswered =
    triggerConfig !== null && hasTiers(triggerConfig) && triggerConfig.tierIds.length === 0;

  // Nothing can go live without something to start it, without the payments it
  // depends on, with an email that can't be sent, or with a trigger whose
  // audience is unanswered. An automation with no trigger isn't
  // half-configured, it's an automation that cannot run — and neither is one
  // waiting on Stripe, carrying a blank email, or listening for tiers nobody
  // has named.
  const canGoLive = triggerConfig !== null && !stripeMissing && !blankEmails && !tiersUnanswered;
  const paneHidden = paneCollapsed;
  // What's running (read canvas) vs what's being edited (edit canvas).

  // Nothing is written until Save or Publish, so an edit only has to be recorded.
  // Whether anything actually differs is read back off the draft.
  const handleDraftChange = (next: AutomationDetail) => setDraft(next);

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
        toast.success('Automation is live');
      },
      () => setStartOpen(false),
    );
  };

  const publishChanges = () => {
    runPublish(
      () => {
        promoteDraft();
        toast.success('Changes published');
      },
      () => setPublishOpen(false),
    );
  };

  // Phase 1 only, and only while the automation is off: commit the edits without
  // taking them live. Same promotion as publishing — with nothing running, the
  // difference between the two is entirely whether liveStatus moves.
  const handleSave = () => {
    promoteDraft();
    toast.success('Automation saved');
  };

  // Publish, while off: take the automation live. It confirms first (the
  // "Publish automation?" dialog), and a draft that fails validation is blocked
  // at the press — popover, and the canvas showing every warning it holds.
  const handlePublishAttempt = () => {
    if (!canGoLive) {
      revealWarnings();
      setPublishBlockedOpen(true);
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
      revealWarnings();
      setPublishBlockedOpen(true);
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

  const openSettings = () => {
    // Seeded from what the screen is currently showing — the pending details if
    // they've been edited this session, the saved ones otherwise. Seeding from
    // the record alone would show a name the header no longer does, which reads
    // as the rename having been lost. This is also what makes abandoning a
    // blanked name safe: reopening shows the name that actually applied.
    setSettingsDraft(draftDetails);
    setSettingsOpen(true);
  };

  // Typing writes through: the field text lands on the details draft as it
  // changes, the header retitles live, and the global Save is the one commit.
  // No toast, no confirm — the dialog's Close just puts it away. The one value
  // that doesn't write through is a blank name: an automation with no name is
  // unfindable in a list, so the draft keeps the last real one while the field
  // is free to be empty mid-edit — close it blank and the previous name stands.
  const handleDetailsChange = (next: { name: string; description: string }) => {
    setSettingsDraft(next);
    const name = next.name.trim();
    setDetailsDraft((prev) => ({
      name: name || (prev ?? savedDetails).name,
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
  // the press — the popover names the deal, and the canvas shows every warning
  // it holds, grace periods included.
  //
  // No save indicator. Flickering "Saving…" on every keystroke draws the eye to
  // plumbing rather than to anything the publisher can act on.
  //
  // Same popover on both primaries: same refusal, same dress as the card
  // warnings' popovers (w-72, one text-md sentence) — the same kind of answer,
  // raised from a control instead of a card. Only one primary renders at a
  // time, so they can share the one piece of open-state.
  const blockedPopover = (button: React.ReactNode) => (
    <Popover open={publishBlockedOpen} onOpenChange={setPublishBlockedOpen}>
      <PopoverAnchor asChild>{button}</PopoverAnchor>
      <PopoverContent align="end" className="w-72">
        <p className="text-md">Fix all issues to publish this automation.</p>
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
        {blockedPopover(<Button onClick={handlePublishAttempt}>Publish</Button>)}
      </>
    ) : (
      <>
        <Button variant="outline" onClick={() => setStopOpen(true)}>
          Turn off
        </Button>
        {blockedPopover(
          <Button disabled={!hasChanges} onClick={handlePublishChangesClick}>
            Publish changes
          </Button>,
        )}
      </>
    );

  return (
    // flex-col in both variants: the docked header is a row above the pane and
    // canvas, and with no header the same column collapses to just that row.
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background"
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
      <HeaderBar
        actions={chromeActions}
        status={liveStatus}
        // The pending name, not the saved one: a rename shows here the moment
        // it's typed, the way a canvas edit shows on the canvas — on screen now,
        // committed by Save.
        title={draftDetails.name}
        onBack={goBack}
        onEditTitle={openSettings}
      />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Left pane docked flush to the edge. On entering edit it slides off the
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
            // animate the same 480px, but a slide takes the pane's contents with
            // it — the title and its controls travelled left and passed under the
            // toggle on their way out, which read as the pane escaping rather than
            // closing. Narrowing holds every child exactly where it is and lets
            // overflow-hidden wipe them from the right as the canvas edge advances,
            // so nothing moves that isn't supposed to.
            //
            // This only works because the child below is pinned to w-[480px]: left
            // to itself the content would reflow as the pane narrowed, wrapping the
            // title and crushing the table for the length of the animation.
            'relative flex shrink-0 flex-col overflow-hidden',
            // 420ms on the proto's shared curve, matching the canvas's creation
            // sequence: publishing opens this pane, and the two shouldn't look like
            // separate animations that happened to fire together. At the old
            // 150ms/ease-out a 480px slab arrived faster than the eye could follow it,
            // which is what made it read as a jump rather than a reveal.
            paneAnimated &&
              `transition-[width] duration-420 ${PROTO_EASE} motion-reduce:transition-none`,
            // A content panel flanking the canvas, so it takes the same step of
            // the ladder as the right-hand analytics sheet.
            'border-r border-border-default bg-surface-elevated',
            // border-r goes with the width: at w-0 a rule would still paint, a
            // stray hairline down the left of the canvas.
            paneHidden ? 'w-0 border-r-0' : 'w-[480px]',
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
            <LeftPanel
              query={query}
              scenario={scenario}
              selectedMemberId={selectedMemberId}
              onQueryChange={setQuery}
              onSelectMember={setSelectedMemberId}
            />
          </div>
        </aside>

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
                {/* Phase 1's toggle is anchored to the row, not to this
                                cluster — and once the pane collapses the canvas starts at
                                x=0, so the two land on the same 16/16 and the member
                                button ends up underneath it.

                                An empty box of the toggle's exact footprint (size-9 is
                                what Shade's size="icon" resolves to) stands in for it, so
                                the Inline's own gap does the spacing and the member
                                button sits off the toggle by the same distance it does in
                                future. Nothing to keep in sync but the size token.

                                No negative inset, because the toggle has none either — its
                                box edge sits on the 24px column in both its states, same as
                                the header's back arrow.

                                Only while collapsed: with the pane open the toggle is
                                480px away over the pane, and reserving space here would
                                indent the member button against nothing. */}
                {paneCollapsed && <div className="size-9 shrink-0" aria-hidden />}
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
              draft={draftFlow}
              revealWarningsSignal={revealSignal}
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
              onChange={handleDraftChange}
              onTriggerConfigChange={handleTriggerConfigChange}
            />
          </div>
        </div>

        {/* Phase 1's pane toggle, anchored to the ROW rather than to either side of
                it — the one thing in this layout that doesn't belong to the pane or the
                canvas, because its whole job is to survive the boundary moving between
                them.

                Inside the pane it would slide away with the pane. On the canvas it
                would appear at the canvas's own left edge — 480px in while the pane is
                still open — and then ride leftward as the pane collapsed, which is the
                flash this replaced. Anchored here it is simply always at 16/16 of the
                row: the pane's own px-6 horizontally, its pt-4 under a 64px header
                vertically. The pane collapses out from under a button that never
                moves, and the same press sends it back.

                z-30 clears the pane's own sticky bars at z-20. The pane holds an
                invisible twin of this button in flow (see reserveToggle) so the
                Performance title starts where it would if this one were really there. */}
        {/* Anchored to the ROW rather than to either side of it — the one thing
                    in this layout that doesn't belong to the pane or the canvas, because
                    its whole job is to survive the boundary moving between them.

                    Which means it changes surface underneath itself, and its chrome has to
                    change with it. Pane OPEN, it stands on the pane — a panel, where a
                    ghost button is what every other control on a panel is. Pane COLLAPSED,
                    the canvas starts at x=0 and the same button is floating over the dot
                    grid, where ghost reads as a glyph with nothing holding it: outline on
                    CANVAS_HUD_BUTTON's opaque surface, the same treatment the zoom controls
                    and the member button take.

                    What does NOT change is where it sits. left-6 in both, box edge on 24,
                    no negative inset either way — it used to pull back 8px while the pane
                    was open, which made the button jump 8px sideways at the moment the
                    pane went. See the header for why 24 is the box edge and not the
                    glyph.

                    One button that restyles, not two that swap: it never unmounts, so the
                    pane collapses out from under a control that stays exactly where it is
                    and the same press sends it back. */}
        <div className="absolute top-4 left-6 z-30">
          <Button
            aria-label={paneCollapsed ? 'Show performance' : 'Hide performance'}
            aria-pressed={!paneCollapsed}
            className={paneCollapsed ? CANVAS_HUD_BUTTON : undefined}
            size="icon"
            type="button"
            variant={paneCollapsed ? 'outline' : 'ghost'}
            onClick={() => setPaneCollapsed(!paneCollapsed)}
          >
            <LucideIcon.PanelLeft strokeWidth={2} />
          </Button>
        </div>
      </div>

      {/* Lifecycle confirms — turning the automation on, and taking it off. */}
      <TurnOnAutomationDialog
        open={startOpen}
        pending={publishing}
        onConfirm={handleStart}
        onOpenChange={setStartOpen}
      />
      <TurnOffAutomationDialog open={stopOpen} onConfirm={handleStop} onOpenChange={setStopOpen} />

      {/* Name and description. Two fields rather than an inline rename, because
                the description has nowhere to be edited in place — it appears on the
                list, not on this screen, so there's no text here to click into.

                No confirmLabel, so the dialog is in its write-through mode: edits
                land on the draft as they're typed and Close is the only button.
                This screen has one Save, in the header, and it commits everything —
                a second Save inside a dialog was two commits answering to one word,
                and even Cancel/Done read as the edit being finished and written.
                The LIST's copy of this dialog keeps Cancel/Save, because a rename
                from the list has no draft to join. */}
      <DetailsDialog
        blurb="Shown on your automations list. Members never see either of these."
        heading="Automation details"
        open={settingsOpen}
        values={settingsDraft}
        onChange={handleDetailsChange}
        onOpenChange={setSettingsOpen}
      />

      {/* Where the delete confirm used to be. If Delete ever returns to the UI, its
                dialog is worth writing again rather than reaching for "this can't be
                undone" — that sentence is true of every delete dialog ever written and
                tells nobody anything; the number of members mid-flow is what actually
                decides it. */}
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
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes will be lost if you leave this automation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Work is genuinely lost here, so the dialog says so in the shipping
                        editor's own words and colours the confirm destructive. */}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <Button variant="destructive" onClick={() => navigationBlocker.proceed?.()}>
              Discard changes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
  // configured, the member in focus — belongs to one automation and starts clean on
  // the next. Without it, React reuses the instance across a route change and the
  // previous automation's draft would follow you to the new one.
  //
  // It used to have to hold that key across one route change: saving a new
  // automation swapped /new for a real id, which is the same automation gaining an
  // id rather than a change of subject — and letting the key change there tore the
  // screen down and rebuilt it mid-publish, header, pane and both React Flow
  // canvases reassembling in full view. That was the first-publish flash.
  //
  // The automation is created before this screen opens now, so its id never changes
  // underneath it and there is no exception left to carve out. Every route change
  // here really is a change of subject.
  return <AutomationFloat key={id} />;
};

export default AutomationFloatScreen;
export const Component = AutomationFloatScreen;
