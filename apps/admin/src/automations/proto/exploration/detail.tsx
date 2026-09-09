import React, { useEffect, useState } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyIndicator,
  Separator,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { toast } from 'sonner';

import { useBlocker, useConfirmUnload, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { getRunData } from '@/automations/proto/shared/mock';
import {
  saveAutomation,
  setAutomationStatus,
  updateAutomationDetails,
  useProtoAutomation,
} from '@/automations/proto/shared/store';
import { changeSummary } from '@/automations/proto/shared/change-summary';
import { HeaderBar, StatusSwitch } from './header-bar';
import { PROTO_EASE } from '@/automations/proto/shared/motion';
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
const LANE = 'exploration' as const;

type LiveStatus = 'active' | 'inactive';
type SaveState = 'saved' | 'saving';

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
// How long the interface takes to get out of the way, and come back. One number for
// every geometric part of it — the header's height, the pane's width, the canvas
// window's margin and radius — because they're one gesture.
const CHROME_MS = 300;

// The floating chrome on this canvas: the identity pill top-left, the actions pill
// top-right, and — already, and not ours — the zoom controls bottom-left.
//
// Sized and surfaced from those zoom controls, since they're the shipped component
// and the one thing here that can't be changed to match: p-0.5 around 36px controls,
// rounded-md, elevated surface, shadow instead of a border. Every floating group is
// then 40px and made of the same material, wherever it sits.
//
// The pills were smaller and outlined before this, which put three sizes and two
// treatments in the four corners of one canvas.
const HUD_PILL = 'flex items-center rounded-md bg-surface-elevated p-0.5 shadow-sm';
// The controls inside one. size="icon" is 36px, which is the number the zoom
// controls use and the number CANVAS_HUD_BUTTON was pinned to for the same reason.
const HUD_CONTROL = 'size-9';
// Mounted after the geometry has settled, so it fades in where it will stay rather
// than riding the canvas as it grows.
const HUD_ENTER = `animate-in duration-200 ${PROTO_EASE} fade-in-0 motion-reduce:animate-none`;

const AutomationFloat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toVersioned = useVersionLink();

  // The automation itself comes from the store, so one that was created in this
  // session is as real as a seeded fixture. Runs and metrics stay hand-authored
  // and keyed by id — a created automation has none, which is the empty state
  // `cancellationSurvey` already designs for.
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
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [stopOpen, setStopOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
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

  // The HUD is mounted once the geometry has finished, rather than faded in place.
  //
  // A CSS fade would keep it in the layout the whole time, and the top-left pill sits
  // in a row with the toggle — space reserved there would hold the toggle out of
  // position whenever the interface is showing. Mounting also gets the reverse for
  // free: on the way back it goes at once, which is right, because what should be
  // watched then is the chrome returning.
  const [hudVisible, setHudVisible] = useState(false);
  useEffect(() => {
    if (!paneCollapsed) {
      setHudVisible(false);
      return;
    }
    const timer = setTimeout(() => setHudVisible(true), CHROME_MS);
    return () => clearTimeout(timer);
  }, [paneCollapsed]);

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

  // Edits autosave, so a difference is saved-but-not-live. Only a running
  // automation has something to diverge FROM — edits to a stopped one aren't
  // "unpublished", since there's no live version they're failing to reach.
  const hasUnpublishedChanges = hasChanges && liveStatus === 'active';

  // Leaving. With autosave the work is safe, so the browser prompt is reserved
  // for the one window where it isn't — a save still in flight — and the in-app
  // dialog says what's actually at stake instead of threatening data loss it
  // can't cause.
  useConfirmUnload(saveState === 'saving');
  const navigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnpublishedChanges && currentLocation.pathname !== nextLocation.pathname,
  );

  const goBack = () => navigate(toVersioned(lanePath(LANE)));

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
  const paneHidden = paneCollapsed;
  // What's running (read canvas) vs what's being edited (edit canvas).

  // The fake autosave tick. Nothing here records that an edit happened: whether
  // anything differs is read from the draft itself.
  const markEdited = () => {
    setSaveState('saving');
    window.setTimeout(() => setSaveState('saved'), 700);
  };

  const handleDraftChange = (next: AutomationDetail) => {
    setDraft(next);
    markEdited();
  };

  const handleTriggerConfigChange = (next: TriggerConfig) => {
    setTriggerConfig(next);
    markEdited();
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
    toast.success('Changes published');
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
  const handleDiscard = () => {
    const previousDraft = draft;
    const previousTriggerConfig = triggerConfig;
    setDraft(null);
    setTriggerConfig(savedTrigger);
    toast('Changes discarded', {
      action: {
        label: 'Undo',
        onClick: () => {
          setDraft(previousDraft);
          setTriggerConfig(previousTriggerConfig);
        },
      },
    });
  };

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
      {/* At most one visible action at a time, which is what four earlier
                attempts kept failing at. Everything that isn't the moment's decision
                moves into the ⋯: lifecycle, management, and undoing a draft.
                Publishing is the only thing that earns the primary slot, and only
                while there's something to publish.

                Stopped, the primary is Turn on — the one thing you'd do with a
                stopped automation — and a draft can't exist to compete with it,
                since edits to something that isn't running have no live version to
                diverge from. */}
      {/* The ⋯ leads, the primary trails. Overflow menus sit to the LEFT of
                the action they qualify everywhere else in the app, so a primary
                appearing to the menu's left made this row read backwards. */}
      {/* modal={false} so the canvas underneath stays live — same reason the
                node menus and the option picker are non-modal. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Automation actions" size="icon" type="button" variant="ghost">
            <LucideIcon.MoreHorizontal strokeWidth={2} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Prototype stub — duplication has no design decision behind it
                        yet, so this reports success without creating anything. */}
          <DropdownMenuItem onClick={() => toast.success('Automation duplicated')}>
            <LucideIcon.Copy /> Duplicate
          </DropdownMenuItem>
          {/* Discard sits last, in its own section. It's the one item here
                        that destroys work, and a menu opens with the cursor at the
                        top — leading with it would put the destructive option
                        directly under the pointer. */}
          {hasUnpublishedChanges && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDiscard}
              >
                <LucideIcon.Undo2 /> Discard changes
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {hasUnpublishedChanges && <Button onClick={handlePublishClick}>Publish changes</Button>}
    </>
  );

  // Hiding and showing the interface, choreographed.
  //
  // Everything geometric moves together on one duration and one curve — the header's
  // height, the pane's width, the canvas window's margin and its radius. They're a
  // single gesture (the chrome leaving, the canvas taking the space), so anything
  // moving at its own speed reads as a second thing happening.
  //
  // What's staggered is what APPEARS and DISAPPEARS. Contents leave fast and early,
  // so nothing is being clipped as its container collapses; they arrive late, after
  // there's somewhere for them to be. That ordering is the whole difference between
  // this reading as deliberate and reading as a jump.
  const chrome = `duration-300 ${PROTO_EASE} motion-reduce:transition-none`;
  // The header's contents, which stay mounted inside a collapsing row: out before the
  // space closes, in after it has opened.
  const leaves = 'opacity-0 duration-150';
  const arrives = 'opacity-100 duration-200 [transition-delay:220ms]';

  return (
    // flex-col in both variants: the docked header is a row above the pane and
    // canvas, and with no header the same column collapses to just that row.
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background"
      data-testid="float-detail"
    >
      {/* The header never carries the pane control in either release — its left
                is the back arrow, the title and its status, full stop.
                
                Gone entirely while the canvas is maximised. The same press that takes the
                pane also takes the header, and everything on it comes back as HUD floating
                over the canvas — Figma's ⌘\ — so maximised means the flow and nothing
                else, rather than the flow plus a bar that was never the subject. */}
      {/* Height, not mounting. Unmounted, the header vanished and everything below
                jumped up a row before any of the animation had started, which is what made
                the whole gesture feel broken rather than fast.
                
                overflow-hidden so the row is clipped as it closes, and its contents fade
                first — a header being cut in half on the way out is worse than one that
                has already gone. */}
      <div
        className={cn(
          'shrink-0 overflow-hidden transition-[height]',
          chrome,
          paneCollapsed ? 'h-0' : 'h-18',
        )}
      >
        <div className={cn('transition-opacity', paneCollapsed ? leaves : arrives)}>
          <HeaderBar
            actions={chromeActions}
            canGoLive={canGoLive}
            status={liveStatus}
            title={automation.name}
            onBack={goBack}
            onStatusChange={handleStatusToggle}
          />
        </div>
      </div>
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
            'relative flex shrink-0 flex-col overflow-hidden transition-[width]',
            chrome,
            // Not a panel at all — page content on the page's own background,
            // with only its own px-6 holding it off the canvas window beside it.
            // No rule, because there are no longer two surfaces meeting that
            // would need one.
            'bg-background',
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
                triggerConfig,
                onTriggerConfigChange: handleTriggerConfigChange,
                allowReentry,
                onAllowReentryChange: setAllowReentry,
              }}
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
            canvasTheme('exploration', Boolean(selectedRun)),
            // Flat chrome makes this the only bounded thing on screen, so it
            // reads as an object: inset from the page, with a radius closing
            // the shape.
            //
            // Right and bottom always, at 24px to match the gutters the pane and
            // the HUD already use. The gap above is already paid for by the
            // header's own height, so a margin there would stack a second gutter
            // on a gutter that was already the right size.
            //
            // Collapsing the pane MAXIMISES the canvas: every margin and the radius
            // go, and it fills everything under the header. Windowed, it keeps its
            // 24px on the right and bottom while the pane's own gutter holds the
            // left — a margin there too would double that gutter.
            //
            // The two states are meant to read as different modes rather than as the
            // same window at two sizes, which is why the radius goes rather than
            // just the margins: a rounded rectangle pinned to the screen edges reads
            // as a window that failed to fit. Transitioned on the same 150ms as the
            // pane's width so the edges move together.
            //
            // Margin rather than padding on the row, so collapsing the pane
            // slides the window leftward to the page edge instead of dragging
            // a gutter along with it.
            //
            // No border. The flow's own fill is what delimits the window now, and
            // a rule as well was drawing the same edge twice at a scale where the
            // radius already reads as a shape. Worth knowing what this costs in
            // DARK: the flow fill and the page background are the same token
            // there by design, so the only thing marking where the canvas ends is
            // the dot pattern stopping.
            // Radius rides with the margin. Snapping square the instant the press
            // landed was the canvas arriving before it had moved.
            'transition-[margin,border-radius]',
            chrome,
            paneCollapsed ? 'm-0 rounded-none' : 'mr-6 mb-6 ml-0 rounded-2xl',
          )}
        >
          {/* The header's action half, floating, on the same 24px inset as everything
                    else on this canvas. Its own pill rather than joined to the left one —
                    they were at opposite ends of the header and should stay at opposite ends
                    of the screen; sliding them together would be a different layout, not a
                    hidden one. */}
          {hudVisible && (
            <div className="absolute top-6 right-6 z-20">
              <div className={cn(HUD_PILL, 'gap-1.5', HUD_ENTER)}>
                {chromeActions}
                {/* The same rule the header uses between its actions and the status,
                                    so the floating version isn't a different arrangement of the
                                    same controls. */}
                <Separator className="h-5" orientation="vertical" />
                <StatusSwitch
                  canGoLive={canGoLive}
                  status={liveStatus}
                  onChange={handleStatusToggle}
                />
              </div>
            </div>
          )}
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

                    top-6 left-6 is the HUD inset every floating thing on this canvas
                    uses — 24px off every edge, matching CANVAS_HUD_INSET, which the zoom
                    controls take in the opposite corner. */}
          <div className="absolute top-6 left-6 z-20">
            <Inline align="center" gap="sm">
              {/* The toggle and, once maximised, the header's identity half beside it —
                                one pill, not a pill and a button. They're a single displaced
                                object, and spacing them apart would read as unrelated things
                                that happen to be near each other.
                                
                                The pill is here in both states. Maximised it holds the way back,
                                the name and the toggle; otherwise just the toggle, where its p-1
                                around a 28px ghost button comes out at the same 36px the
                                standalone outline button was. Which means the toggle never
                                unmounts, moves or restyles as the interface goes — only the
                                things beside it arrive. */}
              {/* Nothing may put width on the toggle's left while the group is closed.
                                Two things tried to: a gap on the pill, which applies either side of
                                a zero-width child; then padding on that child, which under
                                border-box still floors its border box at the padding. Both left the
                                pill looking off-centre around a single button.
                                
                                The space is a margin on the separator instead — inside the clipped
                                content, so it goes to nothing with the rest of it. */}
              <div className={HUD_PILL}>
                {/* The identity half opens the pill from nothing rather than appearing
                                    in it.
                                    
                                    It sits BEFORE the toggle, so anything that mounts here
                                    displaces the toggle — and mounting it outright moved the
                                    button a hundred-odd pixels in a single frame, right after it
                                    had just finished sliding up with the canvas. Two motions, the
                                    second of them instant.
                                    
                                    A grid column from 0fr to 1fr is the way to animate to a width
                                    nobody knows in advance (the name is however long it is). The
                                    child clips while it's narrow, so the toggle is pushed rather
                                    than jumped, and the contents fade so the squeeze isn't read as
                                    the text being crushed. */}
                <div
                  className={cn(
                    'grid min-w-0 transition-[grid-template-columns,opacity]',
                    chrome,
                    hudVisible ? 'grid-cols-[1fr] opacity-100' : 'grid-cols-[0fr] opacity-0',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                    <Button
                      aria-label="Back to automations"
                      className={HUD_CONTROL}
                      size="icon"
                      tabIndex={hudVisible ? undefined : -1}
                      type="button"
                      variant="ghost"
                      onClick={goBack}
                    >
                      <LucideIcon.ArrowLeft strokeWidth={2} />
                    </Button>
                    {/* text-md (14px): a step up from the 12px this started at, which
                                        read as a caption on a control rather than the name of the
                                        thing on screen. Still short of the header's own text-lg —
                                        floating chrome shouldn't claim to be the page title, it's
                                        standing in for one. */}
                    <span className="max-w-56 truncate px-1 text-md font-medium">
                      {automation.name}
                    </span>
                    {/* Same rule as the header's, between what names the automation
                                        and what acts on the view of it. */}
                    <Separator className="mr-1 h-5" orientation="vertical" />
                  </div>
                </div>
                <Button
                  aria-label={paneCollapsed ? 'Show interface' : 'Hide interface'}
                  aria-pressed={paneCollapsed}
                  className={HUD_CONTROL}
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() => setPaneCollapsed(!paneCollapsed)}
                >
                  <LucideIcon.PanelLeft strokeWidth={2} />
                </Button>
              </div>
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
                <div className={HUD_PILL}>
                  <Button
                    aria-label={`Close ${selectedRun.member.name}'s run`}
                    // Its own pill, of the same material as the one beside it — two
                    // groups, because one is about the automation and one is about the
                    // run you've opened, and they come and go independently.
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
            </Inline>
          </div>

          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-150',
              showEditCanvas ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            {/* exitsElsewhere: this lane's settings panel owns exit conditions, so the
                            trigger card would be a second field editing the same value — and two
                            controls for one thing is how they end up disagreeing. */}
            <EditCanvas
              draft={draftFlow}
              triggerConfig={triggerConfig}
              exitsElsewhere
              inlineAnalytics
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
                row: the pane's px-6 less its -ml-2 horizontally, its pt-4 under a 64px
                header vertically. The pane collapses out from under a button that never
                moves, and the same press sends it back.

                z-30 clears the pane's own sticky bars at z-20. The pane holds an
                invisible twin of this button in flow (see reserveToggle) so the
                Performance title starts where it would if this one were really there. */}
      </div>

      {/* Lifecycle confirms — turning the automation on, and taking it off. */}
      <TurnOnAutomationDialog
        open={startOpen}
        onConfirm={handleStart}
        onOpenChange={setStartOpen}
      />
      <TurnOffAutomationDialog open={stopOpen} onConfirm={handleStop} onOpenChange={setStopOpen} />

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
            <AlertDialogTitle>Leave with unpublished changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes are saved, but they won’t affect this automation until you publish them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Nothing is lost by leaving, so the dialog drops the red and just
                        states where things stand. */}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <Button onClick={() => navigationBlocker.proceed?.()}>Leave</Button>
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
  // configured, the member in focus — belongs to one automation and starts clean
  // on the next. Without it, React reuses the instance across a route change and
  // the previous automation's draft would follow you to the new one.
  return <AutomationFloat key={id} />;
};

export default AutomationFloatScreen;
export const Component = AutomationFloatScreen;
