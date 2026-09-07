import React, { useRef, useState } from 'react';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Banner,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyIndicator,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  buttonVariants,
} from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import { toast } from 'sonner';

import { useBlocker, useConfirmUnload, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { getRunData } from '@/automations/proto/shared/mock';
import {
  deleteAutomation,
  duplicateAutomation,
  saveAutomation,
  setAutomationStatus,
  suggestCopyName,
  updateAutomationDetails,
  useProtoAutomation,
  useStripeConnected,
} from '@/automations/proto/shared/store';
import { changeSummary } from '@/automations/proto/shared/change-summary';
import { HeaderBar } from './header-bar';
import { LeftPanel } from './left-panel';
import { type TriggerConfig, needsStripe } from '@/automations/proto/shared/trigger-config';
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
/**
 * Name + description, in a dialog. One component for both the settings dialog and
 * the duplicate dialog, so the two are the same object rather than two that
 * resemble each other — duplicating is naming a new automation, and it should ask
 * the way renaming asks.
 *
 * Values are held by the caller, so nothing is committed by typing and Cancel is
 * a real cancel rather than an undo of writes that already landed.
 */
interface DetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heading: string;
  blurb: string;
  confirmLabel: string;
  values: { name: string; description: string };
  onChange: (next: { name: string; description: string }) => void;
  onConfirm: () => void;
}

const DetailsDialog: React.FC<DetailsDialogProps> = ({
  open,
  onOpenChange,
  heading,
  blurb,
  confirmLabel,
  values,
  onChange,
  onConfirm,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{heading}</DialogTitle>
        <DialogDescription>{blurb}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="automation-name">Name</Label>
          <Input
            id="automation-name"
            value={values.name}
            autoFocus
            onChange={(e) => onChange({ ...values, name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="automation-description">Description</Label>
          <Textarea
            id="automation-description"
            placeholder="What this automation is for"
            rows={3}
            value={values.description}
            onChange={(e) => onChange({ ...values, description: e.target.value })}
          />
          {/* Says where the words end up. Without it the field is a box asking
                    for text with no stated audience, and people either skip it or
                    write for nobody. */}
          <p className="text-sm text-muted-foreground">
            Shown under the name on your automations list.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        {/* An automation with no name is unfindable in a list, so this holds
                    rather than writing an empty one. Nothing else here can be invalid —
                    a blank description is a legitimate answer. */}
        <Button disabled={!values.name.trim()} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const stripeConnected = useStripeConnected();
  // Name + description, edited in their own dialog. Held as draft fields while it's
  // open and written on Save — nothing is committed by typing, so Cancel is a real
  // cancel rather than an undo of writes that already landed.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({ name: '', description: '' });
  // The copy's name and description, offered before it exists.
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateDraft, setDuplicateDraft] = useState({ name: '', description: '' });
  // Set the moment Delete is confirmed, and never unset — the screen is on its
  // way out. Two things downstream have to know: the "not found" state, which is
  // otherwise the correct read of an automation that no longer exists, and the
  // leave guard, which would otherwise ask whether to discard unsaved edits to
  // the thing you just deleted. A ref rather than state because both are read
  // during the same render that removes the automation, and a setState wouldn't
  // have landed yet.
  const deleting = useRef(false);
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
  // That also makes this agree with what publishing does (see handleStart), so
  // the pane has one rule rather than two that happen to overlap.
  //
  // Stopping does NOT close it again. Someone turning an automation off is very
  // often turning it off BECAUSE of what the numbers say, and hiding them at that
  // exact moment would be the app arguing with them.
  const [paneCollapsed, setPaneCollapsed] = useState(() => liveStatus !== 'active');

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
      !deleting.current && hasChanges && currentLocation.pathname !== nextLocation.pathname,
  );

  const goBack = () => navigate(toVersioned(lanePath(LANE)));

  if (!scenario || !record || !id) {
    // Mid-delete: the automation is gone from the store and the route change is
    // already in flight, so this render is a single frame between the two. It
    // used to paint "Automation not found", which reads as a failure — you did
    // something deliberate and the app answered with an error. Nothing at all,
    // for one frame, then the list.
    if (deleting.current) {
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
  // Nothing is hidden for it. The ticket's instinct was to remove the paid
  // trigger and the paid exit conditions when Stripe isn't connected, and the
  // cost of that is a publisher who never learns the feature exists — you can't
  // evaluate something you can't see. Building it and being told why it won't
  // publish is more informative than the option quietly not being there.
  //
  // It also answers a question hiding couldn't: what happens to an automation
  // built while Stripe WAS connected, when it later isn't. That's this same
  // state, so it gets this same banner rather than a second design.
  const stripeMissing = !stripeConnected && triggerConfig !== null && needsStripe(triggerConfig);

  // Nothing can go live without something to start it, or without the payments
  // it depends on. An automation with no trigger isn't half-configured, it's an
  // automation that cannot run — and neither is one waiting on Stripe.
  const canGoLive = triggerConfig !== null && !stripeMissing;
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
    // Open the performance pane on the way live, so the screen ends up in the
    // state it would open in from now on (see paneCollapsed): the pane tracks the
    // lifecycle, and this is the lifecycle changing.
    //
    // It also means someone can't create, build and publish an automation without
    // ever learning this screen has analytics — going live is when they start to
    // matter, so it's when to show them.
    //
    // It opens onto the empty state, deliberately: "Members will appear here as
    // they enter this automation" is a better introduction than a chart would be,
    // because it says where to come back to and what will be here.
    //
    // Only on the transition to live — publishing CHANGES to something already
    // running leaves the pane as the reader left it, since by then they've made
    // their own choice about it.
    setPaneCollapsed(false);
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

  // Duplicate asks before it copies, in the same dialog renaming uses.
  //
  // It used to fire straight off the menu and report itself in a toast, which was
  // too quiet for something that creates a second automation: the only evidence
  // was a message that disappears, and the copy's name had been decided for you.
  // The dialog makes the act deliberate and hands back the one decision worth
  // having — what the copy is called — already filled in, so confirming without
  // reading it still gives a sensible answer.
  const openDuplicate = () => {
    setDuplicateDraft({
      name: suggestCopyName(automation.name),
      description: record.description,
    });
    setDuplicateOpen(true);
  };

  // Copies WHAT'S ON SCREEN — the draft, unsaved edits included — and leaves you
  // where you are.
  //
  // Navigating to the copy was the other candidate, and it collides with explicit
  // save: with unsaved changes, going there would open the "Discard unsaved
  // changes?" guard, which is a baffling thing for Duplicate to ask. Staying put
  // has no such collision, and the toast's action offers the trip anyway for
  // anyone who wanted it — one click, on request, rather than imposed.
  const confirmDuplicate = () => {
    const name = duplicateDraft.name.trim();
    if (!name) {
      return;
    }
    setDuplicateOpen(false);
    const copyId = duplicateAutomation(
      draftFlow,
      triggerConfig,
      duplicateDraft.description.trim(),
      name,
    );
    toast.success(`“${name}” created`, {
      action: {
        label: 'View',
        onClick: () => navigate(toVersioned(`${lanePath(LANE)}/${copyId}`)),
      },
    });
  };

  const openSettings = () => {
    // Seeded from the record each time it opens, so an abandoned edit doesn't
    // reappear the next time.
    setSettingsDraft({
      name: savedAutomation?.name ?? '',
      description: record?.description ?? '',
    });
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    const name = settingsDraft.name.trim();
    if (!name) {
      return;
    }
    setSettingsOpen(false);
    updateAutomationDetails(id, name, settingsDraft.description.trim());
    toast.success('Automation updated');
  };

  const handleDelete = () => {
    setDeleteOpen(false);
    // Flagged before either of the next two lines, because removing the
    // automation re-renders this screen synchronously (the store is an external
    // store) and the route change lands after it.
    deleting.current = true;
    deleteAutomation(id);
    navigate(toVersioned(lanePath(LANE)));
    toast.success('Automation deleted');
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
  // The ⋯ leads and the primary trails: overflow menus sit to the LEFT of the
  // action they qualify everywhere else in the app.
  //
  // modal={false} so the canvas underneath stays live — same reason the node
  // menus and the option picker are non-modal.
  const overflowMenu = (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Automation actions" size="icon" type="button" variant="ghost">
          <LucideIcon.MoreHorizontal strokeWidth={2} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Save moves in here below lg (1024px), where the header has two rows and
                    three actions is one too many beside a title. It's the action that gives
                    up its slot rather than Publish: Publish is why you're on this screen,
                    and Save is reachable in a menu without the moment feeling worse.

                    Duplicated rather than moved — the button below carries the inverse
                    class, so exactly one of the two is ever rendered. */}
        {liveStatus === 'inactive' && (
          <DropdownMenuItem className="lg:hidden" disabled={!hasChanges} onClick={handleSave}>
            <LucideIcon.Save /> Save
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={openSettings}>
          <LucideIcon.Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openDuplicate}>
          <LucideIcon.Copy /> Duplicate
        </DropdownMenuItem>
        {/* Delete sits last. A menu opens with the cursor at the top, so leading
                    with the one item that destroys something would put it directly under
                    the pointer. It used to be fenced off by a separator too; with four
                    items the rules were doing more to break the list up than the grouping
                    justified, and the destructive colour already marks it. */}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <LucideIcon.Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const chromeActions =
    liveStatus === 'inactive' ? (
      <>
        {overflowMenu}
        {/* Nothing to save until something changes. Publish stays available
                either way — an unedited draft is still publishable, which is how
                the shipping editor behaves. */}
        <Button
          className="hidden lg:inline-flex"
          disabled={!hasChanges}
          variant="outline"
          onClick={handleSave}
        >
          Save
        </Button>
        <Button disabled={!canGoLive} onClick={() => setStartOpen(true)}>
          Publish
        </Button>
      </>
    ) : (
      <>
        {overflowMenu}
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
      {/* Says why Publish is unavailable, at the moment it becomes true. Paired
                with the disabled button deliberately: a control that stops working
                without explaining itself is the failure this avoids, and the header
                puts the explanation on the same row as the button it's about.

                Composed exactly as admin's other warning banner is (see
                settings/advanced/migration-tools/content-import/mapping-step): Shade's
                Banner takes children only, so the icon is the caller's to place, and
                copying that arrangement rather than inventing one keeps every warning
                in the app the same object.

                One sentence, stating the rule rather than this instance. "Members",
                not "subscribers": Ghost's noun, and the one every other string on this
                screen uses. */}
      <HeaderBar
        actions={chromeActions}
        notice={
          stripeMissing ? (
            <Banner role="alert" size="sm" variant="warning">
              <Inline align="center" gap="sm">
                <LucideIcon.TriangleAlert className="size-4 shrink-0 text-state-warning" />
                <Text size="sm" weight="semibold">
                  Connect Stripe to publish automations for paid members.
                </Text>
              </Inline>
            </Banner>
          ) : undefined
        }
        status={liveStatus}
        title={automation.name}
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

      {/* Name and description. Two fields rather than an inline rename, because
                the description has nowhere to be edited in place — it appears on the
                list, not on this screen, so there's no text here to click into.
                Reached two ways: the title, which is where people try first, and the
                ⋯, which is what makes it findable for anyone who doesn't. */}
      <DetailsDialog
        blurb="The name and description shown on your automations list."
        confirmLabel="Save"
        heading="Automation settings"
        open={settingsOpen}
        values={settingsDraft}
        onChange={setSettingsDraft}
        onConfirm={saveSettings}
        onOpenChange={setSettingsOpen}
      />

      {/* The copy, named before it exists. Same dialog as settings — naming a new
                automation and renaming an existing one are the same act. */}
      <DetailsDialog
        blurb="Creates a copy of this automation. It starts turned off."
        confirmLabel="Duplicate"
        heading="Duplicate automation"
        open={duplicateOpen}
        values={duplicateDraft}
        onChange={setDuplicateDraft}
        onConfirm={confirmDuplicate}
        onOpenChange={setDuplicateOpen}
      />

      {/* Delete. The one warning this screen can give that the list can't: how
                many members are mid-flow right now. "This can't be undone" is true of
                every delete dialog ever written and tells nobody anything; the number
                of people whose run ends the moment you confirm is the fact that
                actually decides it. */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{automation.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {scenario.metrics.in_progress > 0
                ? `${formatNumber(scenario.metrics.in_progress)} ${scenario.metrics.in_progress === 1 ? 'member is' : 'members are'} currently in this automation. Deleting it ends their runs, and its history goes with it.`
                : 'This automation and its run history will be deleted. This can’t be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
