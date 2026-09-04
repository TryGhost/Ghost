import React, { useState } from 'react';
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
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { toast } from 'sonner';

import { useBlocker, useConfirmUnload, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { getScenario } from '@/automations/proto/shared/mock';
import { changeSummary } from './change-summary';
import { PHASE_SLOT } from './phase-model';
import { HeaderBar } from './header-bar';
import { LeftPanel } from './left-panel';
import {
  ProtoVariantSwitcher,
  ProtoVariantsProvider,
} from '@/automations/proto/shared/proto-variant-switcher';
import {
  DEFAULT_TRIGGER_CONFIG,
  type TriggerConfig,
} from '@/automations/proto/shared/trigger-config';
import { useProtoVariant } from '@/automations/proto/shared/proto-variants';
import {
  CANVAS_HUD_BUTTON,
  CANVAS_SLOT_FILL,
  canvasTheme,
} from '@/automations/proto/canvas/flow-utils';
import { EditCanvas } from '@/automations/proto/canvas/edit-canvas';
import { FlowCanvas } from '@/automations/proto/canvas/flow-canvas';
import { useVersionLink } from '@/automations/proto/shared/use-version-link';

type LiveStatus = 'active' | 'inactive';
type SaveState = 'saved' | 'saving';

// Turn-on / turn-off confirmations. Structure and weight come from the shipped
// editor (plain AlertDialog, non-destructive confirm, same shape of sentence);
// the vocabulary is the proto's, and deliberately narrower than what's shipped.
//
// The verb differs by release, which is why it's a prop rather than a string.
// Future keeps one switch metaphor for the lifecycle — an automation is On or
// Off, and you Turn it on or off — which leaves "publish" to mean exactly one
// thing: pushing edits to an automation that's already on. Phase 1 matches the
// shipping editor instead, where Publish is what takes a stopped automation
// live. Either way the button and the dialog it opens have to say the same word.
const TurnOnAutomationDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  verb: string;
}> = ({ open, onOpenChange, onConfirm, verb }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{verb} automation?</AlertDialogTitle>
        <AlertDialogDescription>
          Your automation will start running. Any member who meets the trigger will be enrolled
          automatically.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <Button onClick={onConfirm}>{verb}</Button>
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

  const scenario = id ? getScenario(id) : undefined;

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Member search. Held by the screen rather than the pane so the pane stays a
  // presentational column — it renders the field and reports typing, and nothing
  // about where the field lives is baked into where the value is kept.
  const [query, setQuery] = useState('');
  const [liveStatus, setLiveStatus] = useState<LiveStatus>(scenario?.automation.status ?? 'active');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [stopOpen, setStopOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  // Edits autosave into `draft`; `publishedDraft` is what the automation is
  // actually running. Publishing promotes one to the other — the same draft vs
  // published split posts already have, and what lets a live automation be
  // edited safely without stopping it first.
  const [draft, setDraft] = useState<AutomationDetail | null>(null);
  const [publishedDraft, setPublishedDraft] = useState<AutomationDetail | null>(null);
  // Trigger + exit criteria. Separate from `draft` because AutomationDetail carries no
  // trigger config yet — the canvases take it as its own prop.
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>(DEFAULT_TRIGGER_CONFIG);
  const [publishedTriggerConfig, setPublishedTriggerConfig] =
    useState<TriggerConfig>(DEFAULT_TRIGGER_CONFIG);

  // Which release this screen is showing (see phase-model). Everything that
  // differs between them reads from this one flag rather than its own slot.
  const isPhaseOne = useProtoVariant(PHASE_SLOT) === 'phase-1';
  // Phase 1 fixes the trigger once the automation exists.
  const triggerLocked = isPhaseOne;

  // Future flattens the screen's chrome: the header loses its rule and fill and
  // the pane loses its border, leaving the canvas as the one bounded object —
  // an inset window on an otherwise plain page. Phase 1 keeps the docked
  // arrangement, where header, pane and canvas are three abutting slabs.
  const flatChrome = !isPhaseOne;
  // The canvas is always editable, so hiding the pane is the user's call.
  const [paneCollapsed, setPaneCollapsed] = useState(false);

  // What's running vs what's being edited. Derived up here, before the early
  // return, because the leave guards below need to know whether anything differs
  // and hooks can't run conditionally.
  const publishedAutomation = publishedDraft ?? scenario?.automation;
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
          publishedTrigger: publishedTriggerConfig,
          draftTrigger: triggerConfig,
        })
      : [];
  const hasChanges = changes.length > 0;

  // The same difference means different things in the two releases, which is most
  // of what separates them.
  //
  // Phase 1: edits are held, not written. It's unsaved work that leaving would
  // destroy — in either lifecycle state, since a stopped automation's edits are
  // just as unsaved as a running one's.
  const hasUnsavedChanges = isPhaseOne && hasChanges;
  // Future: edits autosave, so it's saved-but-not-live. Only a running automation
  // has something to diverge FROM — edits to a stopped one aren't "unpublished",
  // since there's no live version they're failing to reach.
  const hasUnpublishedChanges = !isPhaseOne && hasChanges && liveStatus === 'active';

  // Leaving. Phase 1 can genuinely lose work, so the browser prompt fires on any
  // unsaved edit. With autosave the work is safe, so that prompt is reserved for
  // the one window where it isn't — a save still in flight — and the in-app
  // dialog says what's actually at stake instead of threatening data loss it
  // can't cause.
  useConfirmUnload(isPhaseOne ? hasChanges : saveState === 'saving');
  const navigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (hasUnsavedChanges || hasUnpublishedChanges) &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  const goBack = () => navigate(toVersioned('/automations-proto/float'));

  if (!scenario) {
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
  const paneHidden = paneCollapsed;
  // What's running (read canvas) vs what's being edited (edit canvas).

  // The fake autosave tick, which only runs in the release that has autosave — in
  // phase 1 nothing is written until Save or Publish. Nothing here records that an
  // edit happened: whether anything differs is read from the draft itself.
  const markEdited = () => {
    if (isPhaseOne) {
      return;
    }
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
    setPublishedDraft(draftFlow);
    setPublishedTriggerConfig(triggerConfig);
    setDraft(null);
  };

  const handleStart = () => {
    // Starting takes the automation live as it currently stands, so the draft
    // becomes the published version in the same move — there's no separate
    // "publish" step to remember for something that was never running.
    setStartOpen(false);
    promoteDraft();
    setLiveStatus('active');
    // Title only — the start-confirmation dialog already explained what
    // turning it on means, so the toast just confirms it happened.
    toast.success('Automation is on');
  };

  const publishChanges = () => {
    setPublishOpen(false);
    promoteDraft();
    toast.success('Changes published');
  };

  // Phase 1 only, and only while the automation is off: commit the edits without
  // taking them live. Same promotion as publishing — with nothing running, the
  // difference between the two is entirely whether liveStatus moves.
  const handleSave = () => {
    promoteDraft();
    toast.success('Automation saved');
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
    setTriggerConfig(publishedTriggerConfig);
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

  const handleStop = () => {
    setStopOpen(false);
    setLiveStatus('inactive');
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
  const chromeActions = isPhaseOne ? (
    <>
      {liveStatus === 'inactive' ? (
        <>
          {/* Nothing to save until something changes. Publish stays
                        available either way — an unedited draft is still
                        publishable, which is how the shipping editor behaves. */}
          <Button disabled={!hasChanges} variant="outline" onClick={handleSave}>
            Save
          </Button>
          <Button onClick={() => setStartOpen(true)}>Publish</Button>
        </>
      ) : (
        <>
          <Button variant="outline" onClick={() => setStopOpen(true)}>
            Turn off
          </Button>
          <Button disabled={!hasChanges} onClick={handlePublishClick}>
            {hasChanges ? 'Publish changes' : 'Published'}
          </Button>
        </>
      )}
    </>
  ) : (
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
          {liveStatus === 'active' && (
            <DropdownMenuItem onClick={() => setStopOpen(true)}>
              <LucideIcon.Power /> Turn off
            </DropdownMenuItem>
          )}
          {/* Prototype stub — duplication has no design decision behind it
                        yet, so this reports success without creating anything. */}
          <DropdownMenuItem onClick={() => toast.success('Automation duplicated')}>
            <LucideIcon.Copy /> Duplicate
          </DropdownMenuItem>
          {/* Dead link for now. A verb like everything else in this menu —
                        every other row names something you do, and a lone noun read
                        as a different kind of item. What it opens is where the
                        automation's own configuration would live, including Delete,
                        which wants room to warn about members mid-flow rather than a
                        menu row that fires on click. */}
          <DropdownMenuItem>
            <LucideIcon.Settings /> Configure
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
      {liveStatus === 'inactive' && <Button onClick={() => setStartOpen(true)}>Turn on</Button>}
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
      <HeaderBar
        actions={chromeActions}
        flat={flatChrome}
        status={liveStatus}
        title={automation.name}
        onBack={goBack}
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
            'relative flex shrink-0 flex-col overflow-hidden transition-[width] duration-150 ease-out',
            // Docked: a content panel flanking the canvas, so it takes the same
            // step of the ladder as the right-hand analytics sheet. Flat: it
            // stops being a panel at all — page content on the page's own
            // background, with only its own px-6 holding it off the canvas
            // window beside it. No rule, because there are no longer two
            // surfaces meeting that would need one.
            flatChrome ? 'bg-background' : 'border-r border-border-default bg-surface-elevated',
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
              flat={flatChrome}
              query={query}
              reserveToggle={isPhaseOne}
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
            canvasTheme(isPhaseOne ? 'phase-1' : 'exploration', Boolean(selectedRun)),
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
            flatChrome && 'transition-[margin] duration-150 ease-out',
            flatChrome && (paneCollapsed ? 'm-0 rounded-none' : 'mr-6 mb-6 ml-0 rounded-2xl'),
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
              triggerConfig={publishedTriggerConfig}
            />
          </div>
          {/* One top-left cluster, not two things at the same coordinates: the
                    pane toggle (future's — phase 1's is anchored to the row below) and
                    the member button can both be present at once, so they sit in a row
                    and neither has to know about the other.

                    top-6 left-6 is the HUD inset every floating thing on this canvas
                    uses — 24px off every edge, matching CANVAS_HUD_INSET, which the zoom
                    controls take in the opposite corner. */}
          {(!isPhaseOne || (selectedRun && !showEditCanvas)) && (
            <div className="absolute top-6 left-6 z-20">
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

                                Only while collapsed: with the pane open the toggle is
                                480px away over the pane, and reserving space here would
                                indent the member button against nothing. */}
                {isPhaseOne && paneCollapsed && (
                  <div className="-ml-2 size-9 shrink-0" aria-hidden />
                )}
                {/* Future's pane toggle, in both directions. It used to be
                                two controls — one leading the pane's title to close it,
                                one floating here to bring it back — which meant the way
                                out and the way in lived in different places and the pane
                                carried chrome ahead of its own heading.

                                One button on the canvas instead: it stays put, and the
                                pane stays a clean column of content. Phase 1 keeps its
                                permanent toggle in the header bar and never renders this.

                                Ghost, with no surface of its own: this is chrome for
                                changing what the canvas occupies, not an object on the
                                canvas, and an opaque fill here made it compete with the
                                member button beside it.

                                Maximise / minimise rather than a panel glyph. The same
                                press still shows and hides the pane, but the pane is not
                                what you're looking at when you reach for a control in
                                the CANVAS's corner — from here the visible effect is the
                                canvas taking the screen and giving it back. Phase 1's
                                toggle sits on the seam between the two regions and keeps
                                PanelLeft, because from there it genuinely reads as the
                                panel's control.

                                Future only. Phase 1's is anchored to the row instead
                                (below) so it can hold still while the pane collapses;
                                here the button belongs to the canvas and travels with
                                it. */}
                {!isPhaseOne && (
                  // Sits on the 24px inset as a whole object. It was a bare
                  // ghost button pulled back by -ml-2 to put its GLYPH on
                  // the inset — right for a mark floating on the canvas,
                  // wrong now that it has a surface of its own.
                  <Button
                    aria-label={paneCollapsed ? 'Restore canvas' : 'Maximise canvas'}
                    aria-pressed={paneCollapsed}
                    className={CANVAS_HUD_BUTTON}
                    size="icon"
                    type="button"
                    variant="outline"
                    onClick={() => setPaneCollapsed(!paneCollapsed)}
                  >
                    {paneCollapsed ? (
                      <LucideIcon.Minimize strokeWidth={2} />
                    ) : (
                      <LucideIcon.Maximize strokeWidth={2} />
                    )}
                  </Button>
                )}
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
              draft={draftFlow}
              inlineAnalytics={!isPhaseOne}
              triggerConfig={triggerConfig}
              triggerLocked={triggerLocked}
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
        {isPhaseOne && (
          <div className="absolute top-4 left-6 z-30">
            <Button
              aria-label={paneCollapsed ? 'Show performance' : 'Hide performance'}
              aria-pressed={!paneCollapsed}
              // -ml-2, as everywhere else a ghost icon button meets the inset:
              // the box pulls back so the glyph sits on 24px. Net effect is the
              // box at 16px, which is also exactly where the pane's own leading
              // button sits — so this still lands on the pixels the pane's
              // button occupied, now for a stated reason rather than a
              // coincidence of two different numbers.
              className="-ml-2"
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => setPaneCollapsed(!paneCollapsed)}
            >
              <LucideIcon.PanelLeft strokeWidth={2} />
            </Button>
          </div>
        )}
      </div>

      {/* Lifecycle confirms — turning the automation on, and taking it off. */}
      <TurnOnAutomationDialog
        open={startOpen}
        verb={isPhaseOne ? 'Publish' : 'Turn on'}
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
            <AlertDialogTitle>
              {isPhaseOne ? 'Discard unsaved changes?' : 'Leave with unpublished changes?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPhaseOne
                ? 'Your changes will be lost if you leave this automation.'
                : 'Your changes are saved, but they won’t affect this automation until you publish them.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Phase 1 can actually lose work, so it says so in the shipping
                        editor's own words and colours the confirm destructive. With
                        autosave nothing is lost by leaving, so the same dialog drops
                        the red and just states where things stand. */}
          <AlertDialogFooter>
            <AlertDialogCancel>{isPhaseOne ? 'Keep working' : 'Keep editing'}</AlertDialogCancel>
            <Button
              variant={isPhaseOne ? 'destructive' : 'default'}
              onClick={() => navigationBlocker.proceed?.()}
            >
              {isPhaseOne ? 'Discard changes' : 'Leave'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prototype-only: the flask switcher for flipping design variations. */}
      <ProtoVariantSwitcher />
    </div>
  );
};

// Provider wraps the whole screen (not just the panel) so future slots — node
// styles, header treatments — can register without moving anything.
const AutomationFloatScreen: React.FC = () => (
  <ProtoVariantsProvider slots={[PHASE_SLOT]}>
    <AutomationFloat />
  </ProtoVariantsProvider>
);

export default AutomationFloatScreen;
export const Component = AutomationFloatScreen;
