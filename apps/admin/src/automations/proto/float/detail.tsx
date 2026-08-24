import React, {useState} from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyIndicator} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {toast} from 'sonner';
import {useBlocker} from 'react-router';
import {useConfirmUnload, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {getScenario} from '@/automations/proto/shared/mock';
import {changeSummary} from './change-summary';
import {PHASE_SLOT} from './phase-model';
import {HeaderBar} from './header-bar';
import {LeftPanel} from './left-panel';
import {ProtoVariantSwitcher, ProtoVariantsProvider} from '@/automations/proto/shared/proto-variant-switcher';
import {DEFAULT_TRIGGER_CONFIG, type TriggerConfig} from '@/automations/proto/shared/trigger-config';
import {useProtoVariant} from '@/automations/proto/shared/proto-variants';
import {CANVAS_SURFACE} from '@/automations/proto/canvas/flow-utils';
import {EditCanvas} from '@/automations/proto/canvas/edit-canvas';
import {FlowCanvas} from '@/automations/proto/canvas/flow-canvas';
import {useVersionLink} from '@/automations/proto/shared/use-version-link';

type LiveStatus = 'active' | 'inactive';
type SaveState = 'saved' | 'saving';

// Every control in this screen's floating chrome sits directly on the canvas, and
// Shade's outline variant is bg-transparent — the dot grid reads straight through
// it, so the button looks like a hole rather than a thing. An opaque surface is
// all that's needed; no shadow, because no button in Ghost carries one. Elevation
// here is the border plus the fact that it's opaque over a textured canvas.

// One rail button. `active` highlights it while its flyout is open. forwardRef
// is required (not optional) whenever one of these is a Radix trigger with
// `asChild`, which clones its child and attaches a ref — a plain function
// component would silently drop it. Kept even though no rail button is currently
// a trigger: the ⋯ menu that was is coming back.
interface RailButtonProps extends React.ComponentPropsWithoutRef<'button'> {
    icon: React.ElementType;
    label: string;
    active?: boolean;
}

// `...rest` is essential for the same case: Radix clones the trigger and injects
// the handlers that actually open the menu (onPointerDown/onKeyDown) plus
// aria-*/data-state. Forwarding only the ref isn't enough — those props must be
// spread onto the real <Button> too.
const RailButton = React.forwardRef<HTMLButtonElement, RailButtonProps>(({icon: Icon, label, active, ...rest}, ref) => (
    <Button
        ref={ref}
        aria-label={label}
        className={cn(active && 'bg-muted')}
        size="icon"
        variant="ghost"
        {...rest}
    >
        <Icon strokeWidth={2} />
    </Button>
));
RailButton.displayName = 'RailButton';

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
}> = ({open, onOpenChange, onConfirm, verb}) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{verb} automation?</AlertDialogTitle>
                <AlertDialogDescription>
                    Your automation will start running. Any member who meets the trigger will be enrolled automatically.
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
}> = ({open, onOpenChange, onConfirm}) => (
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
}> = ({open, onOpenChange, onConfirm}) => (
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
    const {id} = useParams<{id: string}>();
    const navigate = useNavigate();
    const toVersioned = useVersionLink();

    const scenario = id ? getScenario(id) : undefined;

    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
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
    const [publishedTriggerConfig, setPublishedTriggerConfig] = useState<TriggerConfig>(DEFAULT_TRIGGER_CONFIG);

    // Which release this screen is showing (see phase-model). Everything that
    // differs between them reads from this one flag rather than its own slot.
    const isPhaseOne = useProtoVariant(PHASE_SLOT) === 'phase-1';
    // Phase 1 fixes the trigger once the automation exists.
    const triggerLocked = isPhaseOne;
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
    const changes = publishedAutomation && activeDraft
        ? changeSummary({
            published: publishedAutomation,
            draft: activeDraft,
            publishedTrigger: publishedTriggerConfig,
            draftTrigger: triggerConfig
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
    const navigationBlocker = useBlocker(({currentLocation, nextLocation}) => (
        (hasUnsavedChanges || hasUnpublishedChanges) && currentLocation.pathname !== nextLocation.pathname
    ));

    const goBack = () => navigate(toVersioned('/automations-proto/float'));

    if (!scenario) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
                <EmptyIndicator title="Automation not found" />
                <Button variant="outline" onClick={goBack}>Back to automations</Button>
            </div>
        );
    }

    const {automation} = scenario;
    // Same two values as above, narrowed. The versions used for the diff are derived
    // before the not-found guard (hooks can't run conditionally), so TypeScript
    // still sees them as possibly-undefined; past the guard they can't be.
    const publishedFlow = publishedAutomation ?? automation;
    const draftFlow = activeDraft ?? automation;
    const selectedRun = selectedMemberId ? scenario.runs.find(r => r.id === selectedMemberId) ?? null : null;
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
                }
            }
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
                    <Button disabled={!hasChanges} variant="outline" onClick={handleSave}>Save</Button>
                    <Button onClick={() => setStartOpen(true)}>Publish</Button>
                </>
            ) : (
                <>
                    <Button variant="outline" onClick={() => setStopOpen(true)}>Turn off</Button>
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
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDiscard}>
                                <LucideIcon.Undo2 /> Discard changes
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            {hasUnpublishedChanges && (
                <Button onClick={handlePublishClick}>Publish changes</Button>
            )}
            {liveStatus === 'inactive' && (
                <Button onClick={() => setStartOpen(true)}>Turn on</Button>
            )}
        </>
    );

    return (
        // flex-col in both variants: the docked header is a row above the pane and
        // canvas, and with no header the same column collapses to just that row.
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background" data-testid="float-detail">
            {/* onTogglePane is phase 1 only: future moves that control onto the pane
                itself, leading the Performance title, and floats it over the canvas
                once the pane is away. */}
            <HeaderBar
                actions={chromeActions}
                paneCollapsed={paneCollapsed}
                status={liveStatus}
                title={automation.name}
                onBack={goBack}
                onTogglePane={isPhaseOne ? () => setPaneCollapsed(!paneCollapsed) : undefined}
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
            <aside className={cn('relative flex w-[480px] shrink-0 flex-col overflow-hidden border-r border-border-default bg-surface-elevated transition-[margin] duration-150 ease-out', paneHidden ? '-ml-[480px]' : 'ml-0')}>
                {/* onCollapse is future only — that release puts the toggle on the
                    pane, beside its title. Phase 1 drives the same state from the
                    header bar, so its pane doesn't carry a control of its own. */}
                <LeftPanel
                    scenario={scenario}
                    selectedMemberId={selectedMemberId}
                    onCollapse={isPhaseOne ? undefined : () => setPaneCollapsed(true)}
                    onSelectMember={setSelectedMemberId}
                />
            </aside>

            {/* Canvas fills the remaining viewport (bounded, not full-bleed), so the flow
                centres within its own region — no left-inset hack needed. Same fill as
                REACT_FLOW_THEME paints inside it, so the region and the flow's own
                background can't disagree at the edges. */}
            <div className={cn('relative min-w-0 flex-1 overflow-hidden', CANVAS_SURFACE)}>
                {/* Both canvases stay mounted and crossfade on mode change. No remount
                    means the incoming flow is already centred — no first-frame node flash.
                    The inactive one is opacity-0 + pointer-events-none so clicks fall to
                    the active canvas beneath/above it. */}
                <div className={cn('absolute inset-0 transition-opacity duration-150', showEditCanvas ? 'pointer-events-none opacity-0' : 'opacity-100')}>
                    <FlowCanvas automation={publishedFlow} selectedRun={selectedRun} triggerConfig={publishedTriggerConfig} />
                </div>
                {/* Reviewing a member: the whole canvas takes an inset frame, stating
                    "you're inside this member's run" once at region scale instead of
                    leaving it to card states. grey-800 rather than a colour — the
                    frame marks a mode, not a status, and the blues/greens inside it
                    keep their meanings. (No semantic token this dark exists: muted
                    tops out at gray-100 and the next semantic stop is surface-inverse,
                    i.e. black — so the frame and its tab sit on the palette grey,
                    which stays near L53% in both modes.) An overlay rather than a
                    border on the region itself, so entering review doesn't shift the
                    canvas by the frame width (2px — 4px was tried and read heavy). */}
                {selectedRun && !showEditCanvas && (
                    <div className="pointer-events-none absolute inset-0 z-10 border-2 border-grey-800" />
                )}

                {/* Future: the pane's own toggle collapses with it, so the way back
                    floats on the canvas where the pane used to start. Phase 1 keeps a
                    permanent toggle in the header bar and never needs this. */}
                {!isPhaseOne && paneCollapsed && (
                    <div className="absolute top-4 left-4 z-20">
                        <Button
                            aria-label="Show performance"
                            className="bg-surface-elevated shadow-sm"
                            size="icon"
                            type="button"
                            variant="outline"
                            onClick={() => setPaneCollapsed(false)}
                        >
                            <LucideIcon.PanelLeft strokeWidth={2} />
                        </Button>
                    </div>
                )}

                {/* Reviewing a member: their profile chip floats over the canvas, with
                    the way out built in. Selection was previously only reversible from
                    the list (click the row again) — nothing on the canvas said whose
                    run this was or offered an exit, so the mode read as sticky.

                    A profile (avatar + name + email), not a caption like "Ada's
                    progress": a caption narrates the mode in system voice, while
                    showing the member makes the canvas self-evidently their journey —
                    and it's the exact shape Ghost renders a member in everywhere else,
                    so it reads as a member pinned to the canvas rather than new
                    chrome. Same initials-avatar recipe as the newsletter feedback
                    list (stringToHslColor + initials fallback). */}
                {/* The way out of the run — a bare close floating in the canvas's
                    top-right. The frame plus the highlighted row carry "whose run
                    this is" on their own; a labelled tab was tried here (Figma's
                    following indicator, in miniature) and read as too much chrome
                    for the job. Docked header only: under floating chrome this
                    corner belongs to the lifecycle cluster, which appends the same
                    close instead. */}
                {selectedRun && !showEditCanvas && (
                    <div className="absolute top-4 right-4 z-20">
                        <RailButton icon={LucideIcon.X} label="Close member view" onClick={() => setSelectedMemberId(null)} />
                    </div>
                )}

                <div className={cn('absolute inset-0 transition-opacity duration-150', showEditCanvas ? 'opacity-100' : 'pointer-events-none opacity-0')}>
                    <EditCanvas draft={draftFlow} inlineAnalytics={!isPhaseOne} triggerConfig={triggerConfig} triggerLocked={triggerLocked} onChange={handleDraftChange} onTriggerConfigChange={handleTriggerConfigChange} />
                </div>

            </div>

            </div>

            {/* Lifecycle confirms — turning the automation on, and taking it off. */}
            <TurnOnAutomationDialog open={startOpen} verb={isPhaseOne ? 'Publish' : 'Turn on'} onConfirm={handleStart} onOpenChange={setStartOpen} />
            <TurnOffAutomationDialog open={stopOpen} onConfirm={handleStop} onOpenChange={setStopOpen} />

            {/* Publish — a deliberate confirm when the automation is already live. */}
            <PublishChangesDialog open={publishOpen} onConfirm={publishChanges} onOpenChange={setPublishOpen} />

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
                        <AlertDialogTitle>{isPhaseOne ? 'Discard unsaved changes?' : 'Leave with unpublished changes?'}</AlertDialogTitle>
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
                        <Button variant={isPhaseOne ? 'destructive' : 'default'} onClick={() => navigationBlocker.proceed?.()}>
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
