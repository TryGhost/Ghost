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
  EmptyIndicator,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { toast } from 'sonner';

import { useBlocker, useConfirmUnload, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { getRunData } from '@/automations/proto/shared/mock';
import {
  saveAutomation,
  setAutomationStatus,
  useProtoAutomation,
} from '@/automations/proto/shared/store';
import { changeSummary } from '@/automations/proto/shared/change-summary';
import { HeaderBar } from './header-bar';
import { LeftPanel } from './left-panel';
import type { TriggerConfig } from '@/automations/proto/shared/trigger-config';
import {
  CANVAS_HUD_BUTTON,
  CANVAS_SLOT_FILL,
  canvasTheme,
} from '@/automations/proto/canvas/flow-utils';
import { EditCanvas } from '@/automations/proto/canvas/edit-canvas';
import { FlowCanvas } from '@/automations/proto/canvas/flow-canvas';
import { useVersionLink } from '@/automations/proto/shared/use-version-link';
import { lanePath } from '@/automations/proto/shared/lanes';
import { LaneSwitcher } from '@/automations/proto/shared/lane-switcher';

// PHASE 1 — the first release. See shared/lanes for why each lane owns its own
// copy of this screen.
//
// Editing works the way the shipping editor already works: changes are held
// until Save or Publish, and leaving with unsaved work warns that it'll be lost.
// The trigger is fixed once one has been saved. Chrome stays docked — header,
// pane and canvas are three abutting surfaces separated by rules.
//
// Creating and deleting automations are NOT part of this release; those live in
// the phase-2 lane.
const LANE = 'phase-1' as const;

type LiveStatus = 'active' | 'inactive';

// Turn-on / turn-off confirmations. Structure and weight come from the shipped
// editor (plain AlertDialog, non-destructive confirm, same shape of sentence);
// the vocabulary is the proto's, and deliberately narrower than what's shipped.
//
// Publish is the word throughout, matching the shipping editor, where Publish is
// what takes a stopped automation live — the button and the dialog it opens have
// to say the same thing. (The exploration lane uses an on/off switch metaphor
// instead, which is why this used to be a prop.)
const TurnOnAutomationDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}> = ({ open, onOpenChange, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Publish automation?</AlertDialogTitle>
        <AlertDialogDescription>
          Your automation will start running. Any member who meets the trigger will be enrolled
          automatically.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <Button onClick={onConfirm}>Publish</Button>
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
  const [stopOpen, setStopOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
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

  // The trigger is fixed once one has been saved — THIS LANE ONLY. Phase 2 makes
  // it fully editable (per-tier triggers are the point there), so don't port this.
  //
  // An automation that arrived here without one (created in the phase-2 lane,
  // which shares this store) can still have one chosen — a locked card with
  // nothing in it would be a dead end.
  const triggerLocked = savedTrigger !== null;

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

  // Edits are held, not written, so any difference is unsaved work that leaving
  // would destroy — in either lifecycle state, since a stopped automation's edits
  // are just as unsaved as a running one's.
  useConfirmUnload(hasChanges);
  const navigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChanges && currentLocation.pathname !== nextLocation.pathname,
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

  // Nothing is written until Save or Publish, so an edit only has to be recorded.
  // Whether anything actually differs is read back off the draft.
  const handleDraftChange = (next: AutomationDetail) => setDraft(next);

  const handleTriggerConfigChange = (next: TriggerConfig) => setTriggerConfig(next);

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

  const handleStop = () => {
    setStopOpen(false);
    setAutomationStatus(id, 'inactive');
  };

  // The header's actions, mirroring the shipping editor exactly (see
  // automations/components/automation-header.tsx): off, Save sits alongside
  // Publish, so committing work and going live stay separate decisions; on,
  // Publish changes reports its own clean state by becoming a disabled
  // "Published" rather than handing that job to a second control. That last part
  // answers the review feedback directly — the button announces the state by what
  // it offers, so nothing has to stand next to it saying "unpublished changes".
  //
  // No save indicator. Flickering "Saving…" on every keystroke draws the eye to
  // plumbing rather than to anything the publisher can act on.
  const chromeActions =
    liveStatus === 'inactive' ? (
      <>
        {/* Nothing to save until something changes. Publish stays available
                either way — an unedited draft is still publishable, which is how
                the shipping editor behaves. */}
        <Button disabled={!hasChanges} variant="outline" onClick={handleSave}>
          Save
        </Button>
        <Button disabled={!canGoLive} onClick={() => setStartOpen(true)}>
          Publish
        </Button>
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
          <div className="flex min-h-0 w-[480px] flex-1 flex-col">
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

                                Only while collapsed: with the pane open the toggle is
                                480px away over the pane, and reserving space here would
                                indent the member button against nothing. */}
                {paneCollapsed && <div className="-ml-2 size-9 shrink-0" aria-hidden />}
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
  // configured, the member in focus — belongs to one automation and starts clean
  // on the next. Without it, React reuses the instance across a route change and
  // the previous automation's draft would follow you to the new one.
  return <AutomationFloat key={id} />;
};

export default AutomationFloatScreen;
export const Component = AutomationFloatScreen;
