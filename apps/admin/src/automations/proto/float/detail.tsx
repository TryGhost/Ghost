import React, {useEffect, useState} from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyIndicator, HoverCard, HoverCardContent, HoverCardTrigger, Label, RadioGroup, RadioGroupItem} from '@tryghost/shade/components';
import {Inline, Stack} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {toast} from 'sonner';
import {useBlocker} from 'react-router';
import {useConfirmUnload, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {getScenario, mockAutomations} from '@/automations/proto/shared/mock';
import {LEFT_PANEL_SLOT, leftPanelComponent} from './panel-variants';
import {ProtoVariantSwitcher, ProtoVariantsProvider} from '@/automations/proto/shared/proto-variant-switcher';
import {DEFAULT_TRIGGER_CONFIG, type TriggerConfig} from '@/automations/proto/shared/trigger-config';
import {useProtoVariant} from '@/automations/proto/shared/proto-variants';
import {SurfaceEditCanvas as FloatEditCanvas} from '@/automations/proto/surface/edit-canvas';
import {SurfaceFlowCanvas as FloatFlowCanvas} from '@/automations/proto/surface/flow-canvas';
import {useVersionLink} from '@/automations/proto/shared/use-version-link';

type LiveStatus = 'active' | 'inactive';
type SaveState = 'saved' | 'saving';
type StopScope = 'new' | 'all';

const StatusPill: React.FC<{status: LiveStatus}> = ({status}) => (
    status === 'active'
        ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green/20 px-2 py-0.5 text-xs font-medium text-green uppercase">
                <span className="size-1.5 rounded-full bg-green" />
                Live
            </span>
        )
        : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
                Off
            </span>
        )
);

// One rail button. `active` highlights it while its flyout is open. forwardRef
// is required (not optional) because the ⋯ button is a DropdownMenuTrigger with
// `asChild`, which clones its child and attaches a ref — a plain function
// component would silently drop it.
interface RailButtonProps extends React.ComponentPropsWithoutRef<'button'> {
    icon: React.ElementType;
    label: string;
    active?: boolean;
}

// `...rest` is essential: when this is a DropdownMenuTrigger with `asChild`,
// Radix clones it and injects the handlers that actually open the menu
// (onPointerDown/onKeyDown) plus aria-*/data-state. Forwarding only the ref
// isn't enough — those props must be spread onto the real <Button> too.
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

const STOP_OPTIONS: {value: StopScope; title: string; description: string}[] = [
    {value: 'new', title: 'Stop new runs', description: 'New members stop enrolling. Members already in the flow finish their journey.'},
    {value: 'all', title: 'Stop all runs', description: 'New members stop enrolling, and members currently in the flow are removed.'}
];

// Deliberately a considered action, not a one-click accident: a live automation
// is read-only, and stopping is what unlocks editing. The friction is the shape of
// the flow itself — open the dialog, actively pick a scope (nothing is selected by
// default), then press the destructive confirm. An earlier iteration also made you
// type a confirm phrase, which was overkill on top of a modal + deliberate choice
// + red button.
const StopAutomationDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (scope: StopScope) => void;
}> = ({open, onOpenChange, onConfirm}) => {
    const [scope, setScope] = useState<StopScope | null>(null);

    // Reset the selection every time the dialog opens, so it always starts blank.
    useEffect(() => {
        if (open) {
            setScope(null);
        }
    }, [open]);

    const submit = () => {
        if (scope) {
            onConfirm(scope);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Stop this automation?</DialogTitle>
                    <DialogDescription>
                        A live automation is read-only. Stopping it unlocks editing — you can start it again when you’re done.
                    </DialogDescription>
                </DialogHeader>

                <RadioGroup value={scope ?? ''} onValueChange={value => setScope(value as StopScope)}>
                    {STOP_OPTIONS.map((option) => {
                        const selected = scope === option.value;
                        return (
                            <Label
                                key={option.value}
                                className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3', selected ? 'border-foreground bg-muted' : 'border-border-default')}
                                htmlFor={`stop-${option.value}`}
                            >
                                <RadioGroupItem className="mt-0.5" id={`stop-${option.value}`} value={option.value} />
                                <Stack gap="xs">
                                    <span className="text-md font-semibold">{option.title}</span>
                                    <span className="text-sm font-normal text-muted-foreground">{option.description}</span>
                                </Stack>
                            </Label>
                        );
                    })}
                </RadioGroup>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button disabled={!scope} variant="destructive" onClick={submit}>Stop automation</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Publishing to a LIVE automation confirms — but only confirms. What happens to
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
                    Are you sure you want to publish these changes to the live automation?
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
 * Float concept — Resend-style lifecycle. A live automation is read-only: the
 * canvas is a preview with per-node analytics and the primary action is Stop
 * (top-right), which opens a high-friction confirm. Stopping flips the whole
 * surface to editable (the edit canvas) and the primary action becomes Start.
 * All chrome floats directly on the canvas, the way the post editor floats its
 * own header over the document.
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
    const [publishOpen, setPublishOpen] = useState(false);
    // Edits autosave into `draft`; `publishedDraft` is what the automation is
    // actually running. Publishing promotes one to the other — the same draft vs
    // published split posts already have, and what lets a live automation be
    // edited safely without stopping it first.
    const [draft, setDraft] = useState<AutomationDetail | null>(null);
    const [publishedDraft, setPublishedDraft] = useState<AutomationDetail | null>(null);
    // Trigger + goals. Separate from `draft` because AutomationDetail carries no
    // trigger config yet — the canvases take it as its own prop.
    const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>(DEFAULT_TRIGGER_CONFIG);
    const [publishedTriggerConfig, setPublishedTriggerConfig] = useState<TriggerConfig>(DEFAULT_TRIGGER_CONFIG);
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    // The left pane's search expands into this screen's top strip, where it would
    // otherwise run into the automation title. The pane tells us when that happens.
    const [paneSearchOpen, setPaneSearchOpen] = useState(false);

    // Which left-panel variation is active (flask switcher, bottom-right).
    const LeftPanel = leftPanelComponent(useProtoVariant(LEFT_PANEL_SLOT));

    // Leaving with unpublished changes. Autosave means the work itself is safe, so
    // the browser prompt is reserved for the one window where it genuinely isn't:
    // an autosave still in flight. Navigating away inside the app is a different
    // risk — the changes are saved but aren't running — so that gets a dialog that
    // says exactly that, rather than threatening data loss it can't cause.
    useConfirmUnload(saveState === 'saving');
    const navigationBlocker = useBlocker(({currentLocation, nextLocation}) => dirty && currentLocation.pathname !== nextLocation.pathname);

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
    // Editing is never gated on stopping the automation — you can edit a live one
    // freely; publishing is where the consequences get decided.
    const showEditCanvas = editing;
    const selectedRun = selectedMemberId ? scenario.runs.find(r => r.id === selectedMemberId) ?? null : null;
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
    const handleStart = () => {
        setLiveStatus('active');
        toast.success('Automation is live', {
            description: 'It’ll start enrolling members who match the trigger.'
        });
    };

    // Publishing promotes the draft to the running version.
    const publishChanges = () => {
        setPublishOpen(false);
        setPublishedDraft(activeDraft);
        setPublishedTriggerConfig(triggerConfig);
        setDraft(null);
        setDirty(false);
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

    const handleStop = (scope: StopScope) => {
        // Both scopes stop the automation in this prototype; scope is captured
        // for when a real backend differentiates "stop new" from "stop all".
        void scope;
        setStopOpen(false);
        setLiveStatus('inactive');
    };

    // Only while the pane is actually on screen — entering edit mode hides the pane
    // (and its search) but the title stays put.
    const titleHidden = paneSearchOpen && !showEditCanvas;

    // Autosave still runs, so this reports the publish state, not the save state:
    // the only thing worth flagging is work that isn't live yet. Nothing to say
    // when everything is published.
    const workingText = saveState === 'saving' ? 'Saving…' : dirty ? 'Unpublished changes' : null;

    return (
        <div className="fixed inset-0 z-50 flex overflow-hidden bg-background" data-testid="float-detail">
            {/* Left pane docked flush to the edge. On entering edit it slides off the
                left (negative margin collapses its flex footprint to 0) and the canvas
                grows leftward to fill. Always mounted so the transition can animate; the
                canvas's ResizeObserver re-centres the flow as it grows. Clearing the
                title overlay is left to each panel variant — one keeps its content
                below it, another puts controls on the same baseline as it. */}
            <aside className={cn('flex w-[480px] shrink-0 flex-col overflow-hidden bg-sidebar transition-[margin] duration-150 ease-out', showEditCanvas ? '-ml-[480px]' : 'ml-0')}>
                <LeftPanel
                    scenario={scenario}
                    selectedMemberId={selectedMemberId}
                    onSearchOpenChange={setPaneSearchOpen}
                    onSelectMember={setSelectedMemberId}
                />
            </aside>

            {/* Canvas fills the remaining viewport (bounded, not full-bleed), so the flow
                centres within its own region — no left-inset hack needed. */}
            <div className="relative min-w-0 flex-1 overflow-hidden bg-background">
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

                {/* Top-right — autosave indicator (while editing), the ⋯ actions menu,
                    the always-available Edit/Done toggle, then the primary lifecycle
                    action: Stop while live (high-friction confirm), Start once stopped. */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
                    {showEditCanvas && <span className="text-xs text-muted-foreground">{workingText}</span>}
                    {/* modal={false} so the menu doesn't block pointer events to the rest
                        of the surface, matching how the analytics flyouts behave. */}
                    <DropdownMenu modal={false} open={moreOpen} onOpenChange={setMoreOpen}>
                        <DropdownMenuTrigger asChild>
                            <RailButton active={moreOpen} icon={LucideIcon.MoreHorizontal} label="More actions" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                <LucideIcon.Copy /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                                <LucideIcon.Trash2 /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {/* Edit mode is about the draft, so it carries only draft actions:
                        Done when there's nothing outstanding, Discard/Publish when there
                        is. Stop and Start are lifecycle actions and stay in read mode —
                        stopping is no longer a prerequisite for editing. */}
                    {showEditCanvas ? (
                        dirty ? (
                            <>
                                <Button variant="outline" onClick={handleDiscard}>Discard changes</Button>
                                <Button onClick={handlePublishClick}>Publish changes</Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={() => setEditing(false)}>Done</Button>
                        )
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setEditing(true)}>
                                <LucideIcon.Pencil /> Edit
                            </Button>
                            {liveStatus === 'inactive' ? (
                                <Button onClick={handleStart}>Start</Button>
                            ) : (
                                <Button onClick={() => setStopOpen(true)}>Stop</Button>
                            )}
                        </>
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
                    <HoverCard closeDelay={150} open={switcherOpen} openDelay={150} onOpenChange={setSwitcherOpen}>
                        <HoverCardTrigger asChild>
                            <Button
                                className={cn(
                                    'h-auto min-w-0 gap-2 rounded-full px-2 py-1 text-lg font-semibold transition-opacity',
                                    // Yields to the pane's search when it expands across
                                    // the strip. Faded out rather than unmounted so the
                                    // title doesn't pop back in as the input closes.
                                    titleHidden && 'pointer-events-none opacity-0'
                                )}
                                variant="ghost"
                            >
                                <span className="truncate">{automation.name}</span>
                                <StatusPill status={liveStatus} />
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

            {/* Stop — the high-friction confirm for taking a live automation down. */}
            <StopAutomationDialog open={stopOpen} onConfirm={handleStop} onOpenChange={setStopOpen} />

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
    <ProtoVariantsProvider slots={[LEFT_PANEL_SLOT]}>
        <AutomationFloat />
    </ProtoVariantsProvider>
);

export default AutomationFloatScreen;
export const Component = AutomationFloatScreen;
