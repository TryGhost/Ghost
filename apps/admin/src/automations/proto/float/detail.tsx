import React, {useState} from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, EmptyIndicator, HoverCard, HoverCardContent, HoverCardTrigger, Popover, PopoverClose, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {Inline, Stack} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {toast} from 'sonner';
import {useBlocker} from 'react-router';
import {useConfirmUnload, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {getScenario, mockAutomations} from '@/automations/proto/shared/mock';
import {type ChangeEntry, changeSummary} from './change-summary';
import {EDITING_MODEL_SLOT} from './editing-model';
import {LEFT_PANEL_SLOT, leftPanelComponent} from './panel-variants';
import {ProtoVariantSwitcher, ProtoVariantsProvider} from '@/automations/proto/shared/proto-variant-switcher';
import {DEFAULT_TRIGGER_CONFIG, type TriggerConfig} from '@/automations/proto/shared/trigger-config';
import {useProtoVariant} from '@/automations/proto/shared/proto-variants';
import {CANVAS_SURFACE} from '@/automations/proto/surface/flow-utils';
import {SurfaceEditCanvas as FloatEditCanvas} from '@/automations/proto/surface/edit-canvas';
import {SurfaceFlowCanvas as FloatFlowCanvas} from '@/automations/proto/surface/flow-canvas';
import {useVersionLink} from '@/automations/proto/shared/use-version-link';

type LiveStatus = 'active' | 'inactive';
type SaveState = 'saved' | 'saving';

const StatusPill: React.FC<{status: LiveStatus}> = ({status}) => (
    status === 'active'
        ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green/20 px-2 py-0.5 text-xs font-medium text-green uppercase">
                <span className="size-1.5 rounded-full bg-green" />
                On
            </span>
        )
        : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
                Off
            </span>
        )
);

// Status and the action that changes it, as one control. Reads as the current
// state — a status dot and On/Off — but it's a button, so the thing you're
// reacting to is also the thing you click. That's a shorter path than reading the
// state in one corner and acting on it in another, and it's why the top-right
// needs no separate lifecycle button.
//
// The menu names the action rather than the state ("Turn off automation", not
// "Off"): with two states a bare state list makes you infer what selecting it
// does, whereas one explicit verb says it.
const StatusControl: React.FC<{status: LiveStatus; onSelect: (next: LiveStatus) => void}> = ({status, onSelect}) => {
    const on = status === 'active';
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {/* Button shape, badge colours: ghost (so there's no border fighting
                    the tint) with the same green/muted values the status badge uses.
                    The chevron inherits the text colour, so it tints too. */}
                <Button
                    className={cn(on
                        ? 'bg-green/20 text-green hover:bg-green/30'
                        : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20')}
                    variant="ghost"
                >
                    <span className={cn('size-1.5 shrink-0 rounded-full', on ? 'bg-green' : 'bg-muted-foreground')} />
                    {on ? 'On' : 'Off'}
                    <LucideIcon.ChevronDown className="opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {on ? (
                    <DropdownMenuItem onClick={() => onSelect('inactive')}>Turn off automation</DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => onSelect('active')}>Turn on automation</DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

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
// One switch metaphor owns the lifecycle — an automation is On or Off, and you
// Turn it on or off — which leaves "publish" to mean exactly one thing: pushing
// edits to an automation that's already on. The shipped build currently spends
// "Publish" on both, so turning one on and updating a running one read as the
// same act when they aren't.
const TurnOnAutomationDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}> = ({open, onOpenChange, onConfirm}) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Turn on automation?</AlertDialogTitle>
                <AlertDialogDescription>
                    Your automation will start running. Any member who meets the trigger will be enrolled automatically.
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

// The unpublished-changes control. One button standing in for what used to be
// several: it reports that a draft exists, says what's in it, and holds both ways
// of resolving it. Putting Discard and Publish together — behind a deliberate
// click, next to the list of what they'd act on — means neither is a stray click
// away in the header, and the header keeps its stable lifecycle action instead.
const UnpublishedChanges: React.FC<{
    changes: ChangeEntry[];
    onDiscard: () => void;
    onPublish: () => void;
}> = ({changes, onDiscard, onPublish}) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="outline">
                <LucideIcon.TriangleAlert className="text-yellow" />
                Unpublished changes
            </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
            <Stack className="max-h-72 overflow-y-auto p-4" gap="sm">
                {changes.length === 0 ? (
                    // Reachable while an edit is mid-flight, or if something changed
                    // that this summary doesn't know how to describe.
                    <span className="text-sm text-muted-foreground">This draft differs from what’s live.</span>
                ) : changes.map(change => (
                    <Inline key={change.id} align="start" className="text-sm" gap="sm">
                        <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                        <span>{change.label}</span>
                    </Inline>
                ))}
            </Stack>
            {/* Both close the popover: discard would leave it hovering over a list it
                just emptied, and publish opens a confirm dialog it would sit behind.
                Discard's undo lives in the toast it raises. */}
            <div className="flex gap-2 border-t border-border-default p-3">
                <PopoverClose asChild>
                    <Button className="flex-1" size="sm" type="button" variant="outline" onClick={onDiscard}>
                        Discard changes
                    </Button>
                </PopoverClose>
                <PopoverClose asChild>
                    <Button className="flex-1" size="sm" type="button" onClick={onPublish}>
                        Publish changes
                    </Button>
                </PopoverClose>
            </div>
        </PopoverContent>
    </Popover>
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
 * Reuses the surface concept's canvases directly (SurfaceEditCanvas /
 * SurfaceFlowCanvas) — the canvas itself isn't part of what "float" changes.
 */
const AutomationFloat: React.FC = () => {
    const {id} = useParams<{id: string}>();
    const navigate = useNavigate();
    const toVersioned = useVersionLink();

    const scenario = id ? getScenario(id) : undefined;

    // The Overview + Runs card is always docked now (no toolbar toggles), so the
    // only view state left is whether we're editing the flow. Editing is entered
    // from the header and only when stopped.
    const [editing, setEditing] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [liveStatus, setLiveStatus] = useState<LiveStatus>(scenario?.automation.status ?? 'active');
    const [dirty, setDirty] = useState(false);
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
    const [switcherOpen, setSwitcherOpen] = useState(false);
    // The left pane's search expands into this screen's top strip, where it would
    // otherwise run into the automation title. The pane tells us when that happens.
    const [paneSearchOpen, setPaneSearchOpen] = useState(false);

    // Which left-panel variation is active (flask switcher, bottom-right).
    const LeftPanel = leftPanelComponent(useProtoVariant(LEFT_PANEL_SLOT));
    // Whether editing is a mode you enter, or just how the canvas always behaves.
    const alwaysEditable = useProtoVariant(EDITING_MODEL_SLOT) === 'always';
    // Only meaningful when there's no edit mode to hide the pane for you.
    const [paneCollapsed, setPaneCollapsed] = useState(false);

    // Only a running automation has something to diverge FROM. Edits to a stopped
    // one aren't "unpublished" — there's no live version they're failing to reach,
    // so the draft simply is the automation, and Start is what takes it live.
    const hasUnpublishedChanges = dirty && liveStatus === 'active';

    // Leaving with unpublished changes. Autosave means the work itself is safe, so
    // the browser prompt is reserved for the one window where it genuinely isn't:
    // an autosave still in flight. Navigating away inside the app is a different
    // risk — the changes are saved but aren't running — so that gets a dialog that
    // says exactly that, rather than threatening data loss it can't cause.
    useConfirmUnload(saveState === 'saving');
    const navigationBlocker = useBlocker(({currentLocation, nextLocation}) => hasUnpublishedChanges && currentLocation.pathname !== nextLocation.pathname);

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
    const selectedRun = selectedMemberId ? scenario.runs.find(r => r.id === selectedMemberId) ?? null : null;
    // Editing is never gated on stopping the automation — you can edit a live one
    // freely; publishing is where the consequences get decided.
    //
    // With no edit mode, the canvas is editable unless a member's run is in focus —
    // reviewing what happened to someone is the one thing that genuinely wants a
    // read-only view. The existing crossfade between the two canvases handles that
    // unchanged; only the condition driving it differs.
    const showEditCanvas = alwaysEditable ? !selectedRun : editing;
    // What hides the pane: the mode, or the user.
    const paneHidden = alwaysEditable ? paneCollapsed : showEditCanvas;
    // What's running (read canvas) vs what's being edited (edit canvas).
    const publishedAutomation = publishedDraft ?? automation;
    const activeDraft = draft ?? publishedAutomation;

    // Any edit marks the automation dirty and runs the fake autosave tick.
    const markEdited = () => {
        setDirty(true);
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
        setPublishedDraft(activeDraft);
        setPublishedTriggerConfig(triggerConfig);
        setDraft(null);
        setDirty(false);
    };

    const handleStart = () => {
        // Starting takes the automation live as it currently stands, so the draft
        // becomes the published version in the same move — there's no separate
        // "publish" step to remember for something that was never running.
        setStartOpen(false);
        promoteDraft();
        setLiveStatus('active');
        toast.success('Automation is on', {
            description: 'It’ll start enrolling members who match the trigger.'
        });
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
        setTriggerConfig(publishedTriggerConfig);
        setDirty(false);
        toast('Changes discarded', {
            action: {
                label: 'Undo',
                onClick: () => {
                    setDraft(previousDraft);
                    setTriggerConfig(previousTriggerConfig);
                    setDirty(true);
                }
            }
        });
    };

    const handleStop = () => {
        setStopOpen(false);
        setLiveStatus('inactive');
    };

    // The status control only chooses a direction; the confirm dialogs are still
    // what actually commit it, so both routes into a status change agree.
    const handleStatusSelect = (next: LiveStatus) => {
        if (next === liveStatus) {
            return;
        }
        if (next === 'active') {
            setStartOpen(true);
        } else {
            setStopOpen(true);
        }
    };

    // Only while the pane is actually on screen — entering edit mode hides the pane
    // (and its search) but the title stays put.
    const titleHidden = paneSearchOpen && !paneHidden;

    // Autosave still runs, so this reports the publish state, not the save state:
    // the only thing worth flagging is work that isn't live yet. Nothing to say
    // when everything is published.
    // No save indicator. Autosave is meant to be unremarkable, and flickering
    // "Saving…" on every keystroke draws the eye to plumbing rather than to
    // anything the publisher can act on. `saveState` still exists — it's what tells
    // the browser prompt that a write is genuinely in flight — it just isn't shown.
    //
    // Without an edit mode the "Unpublished changes" button already reports that
    // state, so saying it in text as well would be saying it twice.
    const indicatorText = !alwaysEditable && hasUnpublishedChanges ? 'Unpublished changes' : null;

    // What's in the draft that isn't live. Cheap enough to derive per render, and
    // only while there's actually something to describe.
    const changes = hasUnpublishedChanges
        ? changeSummary({
            published: publishedAutomation,
            draft: activeDraft,
            publishedTrigger: publishedTriggerConfig,
            draftTrigger: triggerConfig
        })
        : [];

    return (
        <div className="fixed inset-0 z-50 flex overflow-hidden bg-background" data-testid="float-detail">
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
                <LeftPanel
                    scenario={scenario}
                    selectedMemberId={selectedMemberId}
                    onSearchOpenChange={setPaneSearchOpen}
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
                    <FloatFlowCanvas automation={publishedAutomation} selectedRun={selectedRun} triggerConfig={publishedTriggerConfig} />
                </div>
                <div className={cn('absolute inset-0 transition-opacity duration-150', showEditCanvas ? 'opacity-100' : 'pointer-events-none opacity-0')}>
                    <FloatEditCanvas draft={activeDraft} triggerConfig={triggerConfig} onChange={handleDraftChange} onTriggerConfigChange={handleTriggerConfigChange} />
                </div>

                {/* Collapse toggle, sitting over the canvas just past the pane's edge —
                    a control on the boundary rather than something floating on top of
                    the pane's own header. It lives in the canvas region, so it stays put
                    when the pane slides away; the title cluster carries the counterpart
                    that brings the pane back. */}
                {alwaysEditable && !paneCollapsed && (
                    <div className="absolute top-4 left-4 z-10">
                        <RailButton
                            icon={LucideIcon.PanelLeft}
                            // One icon for both states — it names the thing being
                            // toggled rather than animating a direction, which is how
                            // sidebar toggles read everywhere else. The label carries
                            // the state for screen readers.
                            label="Hide performance"
                            onClick={() => setPaneCollapsed(true)}
                        />
                    </div>
                )}

                {/* Top-right — autosave indicator (while editing), the
                    always-available Edit/Done toggle, then the primary lifecycle
                    action: Stop while live (high-friction confirm), Start once stopped.
                    Duplicate/Delete lived here behind a ⋯ menu; they're out of scope
                    for now and will come back once there's a decision to design. */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
                    {showEditCanvas && indicatorText && <span className="text-xs text-muted-foreground">{indicatorText}</span>}
                    {/* Without an edit mode this corner holds two things at most: the
                        draft to settle, when there is one, and the status control —
                        which is the lifecycle button and the status badge collapsed
                        into one, so nothing here is purely decorative. */}
                    {alwaysEditable && (
                        <>
                            {hasUnpublishedChanges && (
                                <UnpublishedChanges
                                    changes={changes}
                                    onDiscard={handleDiscard}
                                    onPublish={handlePublishClick}
                                />
                            )}
                            <StatusControl status={liveStatus} onSelect={handleStatusSelect} />
                        </>
                    )}

                    {/* Explicit edit mode keeps the draft actions in the header. */}
                    {!alwaysEditable && hasUnpublishedChanges && (
                        <>
                            <Button variant="outline" onClick={handleDiscard}>Discard changes</Button>
                            <Button onClick={handlePublishClick}>Publish changes</Button>
                        </>
                    )}

                    {/* With one, edit mode carries only draft actions (Done here, since
                        there's nothing outstanding), and the lifecycle actions live in
                        read mode. */}
                    {!hasUnpublishedChanges && !alwaysEditable && (
                        showEditCanvas ? (
                            <Button variant="outline" onClick={() => setEditing(false)}>Done</Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setEditing(true)}>
                                    <LucideIcon.Pencil /> Edit
                                </Button>
                                {/* Same reasoning as the always-editable branch above:
                                    Start is the CTA, Stop is de-escalation. Kept
                                    identical so the two editing models differ only in
                                    the thing being compared. */}
                                {liveStatus === 'inactive' ? (
                                    <Button onClick={() => setStartOpen(true)}>Turn on</Button>
                                ) : (
                                    <Button variant="outline" onClick={() => setStopOpen(true)}>Turn off</Button>
                                )}
                            </>
                        )
                    )}

                </div>
            </div>

            {/* Title — persistent overlay at the screen's top-left; stays put in edit
                mode even though the pane hides. pointer-events-none container so empty
                space passes clicks through; the title row opts back in. */}
            <div className="pointer-events-none absolute top-4 left-4 z-30">
                <Inline align="center" className="pointer-events-auto" gap="sm">
                    {/* The back arrow always stays — search indents past it rather than
                        covering it, so there's never a moment with no way out. Only the
                        title yields the space. */}
                    <RailButton icon={LucideIcon.ArrowLeft} label="Back to automations" onClick={goBack} />
                    {/* Collapsed, the pane it belongs to isn't there to hold it, so it
                        falls back to the title cluster — otherwise collapsing would be
                        a one-way door. Open, it lives at the pane's own right edge
                        (below). */}
                    {alwaysEditable && paneCollapsed && (
                        <RailButton
                            icon={LucideIcon.PanelLeft}
                            label="Show performance"
                            onClick={() => setPaneCollapsed(false)}
                        />
                    )}
                    <HoverCard closeDelay={150} open={switcherOpen} openDelay={150} onOpenChange={setSwitcherOpen}>
                        <HoverCardTrigger asChild>
                            <Button
                                className={cn(
                                    // text-lg! (15px) — the `!` is required, not stylistic:
                                    // Button's base class sets text-control (13px), and
                                    // tailwind-merge can't tell that's a font size rather
                                    // than a colour, so it doesn't strip it. Without the
                                    // important, source order wins and the title silently
                                    // renders at 13px. Shade's own size variants do the
                                    // same thing.
                                    'h-auto min-w-0 gap-2 rounded-full px-2 py-1 text-lg! font-semibold transition-opacity',
                                    // Yields to the pane's search when it expands across
                                    // the strip. Faded out rather than unmounted so the
                                    // title doesn't pop back in as the input closes.
                                    titleHidden && 'pointer-events-none opacity-0'
                                )}
                                variant="ghost"
                            >
                                <span className="truncate">{automation.name}</span>
                                {/* Without an edit mode the badge becomes its own
                                    control beside the title, so it can't live inside
                                    this button — nesting one would be invalid and
                                    unclickable. */}
                                {!alwaysEditable && <StatusPill status={liveStatus} />}
                            </Button>
                        </HoverCardTrigger>
                        <HoverCardContent align="start" className="max-h-80 w-64 overflow-y-auto p-1">
                            {mockAutomations.map(a => (
                                <Button
                                    key={a.id}
                                    className={cn(
                                        'w-full justify-between gap-3 px-2 py-1.5 font-normal',
                                        a.id === automation.id && 'bg-muted-foreground/10 font-medium'
                                    )}
                                    variant="ghost"
                                    onClick={() => {
                                        setSwitcherOpen(false);
                                        if (a.id !== automation.id) {
                                            navigate(toVersioned(`/automations-proto/float/${a.id}`));
                                        }
                                    }}
                                >
                                    <span className="truncate">{a.name}</span>
                                    <StatusPill status={a.status} />
                                </Button>
                            ))}
                        </HoverCardContent>
                    </HoverCard>
                </Inline>
            </div>

            {/* Lifecycle confirms — turning the automation on, and taking it off. */}
            <TurnOnAutomationDialog open={startOpen} onConfirm={handleStart} onOpenChange={setStartOpen} />
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
                        <AlertDialogTitle>Leave with unpublished changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your changes are saved, but they won’t affect this automation until you publish them.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep editing</AlertDialogCancel>
                        <Button onClick={() => navigationBlocker.proceed?.()}>Leave</Button>
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
    <ProtoVariantsProvider slots={[LEFT_PANEL_SLOT, EDITING_MODEL_SLOT]}>
        <AutomationFloat />
    </ProtoVariantsProvider>
);

export default AutomationFloatScreen;
export const Component = AutomationFloatScreen;
