import React, {useEffect, useState} from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyIndicator, HoverCard, HoverCardContent, HoverCardTrigger, Label, RadioGroup, RadioGroupItem} from '@tryghost/shade/components';
import {Inline, Stack} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {toast} from 'sonner';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
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
    const [draft, setDraft] = useState<AutomationDetail | null>(null);
    // Trigger + goals. Separate from `draft` because AutomationDetail carries no
    // trigger config yet — the canvases take it as its own prop.
    const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>(DEFAULT_TRIGGER_CONFIG);
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);

    // Which left-panel variation is active (flask switcher, bottom-right).
    const LeftPanel = leftPanelComponent(useProtoVariant(LEFT_PANEL_SLOT));

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
    // Edit is always available and enters the edit canvas straight away, live or not —
    // it's never hidden behind Stop. `isEditable` (stopped) only governs whether edits
    // can be APPLIED; while live, that's surfaced as a plain banner over the edit canvas
    // (below), never a disabled button or a redirecting popover.
    const isEditable = liveStatus === 'inactive';
    const showEditCanvas = editing;
    const selectedRun = selectedMemberId ? scenario.runs.find(r => r.id === selectedMemberId) ?? null : null;
    const activeDraft = draft ?? automation;

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

    // Start — take the (edited, stopped) automation live. No confirm dialog: going
    // live is low-friction and reversible via Stop, and a blocking modal would
    // interrupt the edit→start flow. A toast confirms it instead. All the friction
    // lives on Stop.
    const handleStart = () => {
        setDirty(false);
        setLiveStatus('active');
        setEditing(false); // leave the edit canvas — a live automation is read-only
        toast.success('Automation is live', {
            description: 'It’ll start enrolling members who match the trigger.'
        });
    };

    const handleStop = (scope: StopScope) => {
        // Both scopes stop the automation in this prototype; scope is captured
        // for when a real backend differentiates "stop new" from "stop all".
        void scope;
        setStopOpen(false);
        setLiveStatus('inactive');
    };

    const workingText = saveState === 'saving' ? 'Saving…' : dirty ? 'Unsaved changes' : 'No changes';

    return (
        <div className="fixed inset-0 z-50 flex overflow-hidden bg-background" data-testid="float-detail">
            {/* Left pane docked flush to the edge. On entering edit it slides off the
                left (negative margin collapses its flex footprint to 0) and the canvas
                grows leftward to fill. Always mounted so the transition can animate; the
                canvas's ResizeObserver re-centres the flow as it grows. pt-16 clears the
                title overlay that persists at the screen's top-left. */}
            <aside className={cn('flex w-[480px] shrink-0 flex-col overflow-hidden bg-sidebar pt-16 transition-[margin] duration-150 ease-out', showEditCanvas ? '-ml-[480px]' : 'ml-0')}>
                <LeftPanel scenario={scenario} selectedMemberId={selectedMemberId} onSelectMember={setSelectedMemberId} />
            </aside>

            {/* Canvas fills the remaining viewport (bounded, not full-bleed), so the flow
                centres within its own region — no left-inset hack needed. */}
            <div className="relative min-w-0 flex-1 overflow-hidden bg-background">
                {/* Both canvases stay mounted and crossfade on mode change. No remount
                    means the incoming flow is already centred — no first-frame node flash.
                    The inactive one is opacity-0 + pointer-events-none so clicks fall to
                    the active canvas beneath/above it. */}
                <div className={cn('absolute inset-0 transition-opacity duration-150', showEditCanvas ? 'pointer-events-none opacity-0' : 'opacity-100')}>
                    <FloatFlowCanvas automation={automation} selectedRun={selectedRun} triggerConfig={triggerConfig} />
                </div>
                <div className={cn('absolute inset-0 transition-opacity duration-150', showEditCanvas ? 'opacity-100' : 'pointer-events-none opacity-0')}>
                    <FloatEditCanvas draft={activeDraft} triggerConfig={triggerConfig} onChange={handleDraftChange} onTriggerConfigChange={handleTriggerConfigChange} />
                </div>

                {/* Editing a live automation: you can explore/edit freely, but changes
                    can't be applied until it's stopped. Surface that as a plain banner
                    (Stop is right there in the header) — never a disabled Edit button or
                    a popover that redirects you. pointer-events-none: it's informational. */}
                {showEditCanvas && !isEditable && (
                    <div className="pointer-events-none absolute top-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-border-default bg-background px-4 py-2.5 shadow-lg">
                        <LucideIcon.Info className="size-4 shrink-0 text-blue-500" />
                        <span className="text-sm">This automation is live — stop it to apply your changes.</span>
                    </div>
                )}

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
                    {/* Edit is always available — it enters the edit canvas whether or not
                        the automation is live (a banner explains the live case), toggling
                        to Done while editing. */}
                    {editing ? (
                        <Button variant="outline" onClick={() => setEditing(false)}>Done</Button>
                    ) : (
                        <Button variant="outline" onClick={() => setEditing(true)}>
                            <LucideIcon.Pencil /> Edit
                        </Button>
                    )}
                    {isEditable ? (
                        <Button onClick={handleStart}>Start</Button>
                    ) : (
                        <Button onClick={() => setStopOpen(true)}>Stop</Button>
                    )}
                </div>
            </div>

            {/* Title — persistent overlay at the screen's top-left; stays put in edit
                mode even though the pane hides. pointer-events-none container so empty
                space passes clicks through; the title row opts back in. */}
            <div className="pointer-events-none absolute top-4 left-4 z-30">
                <Inline align="center" className="pointer-events-auto" gap="sm">
                    <RailButton icon={LucideIcon.ArrowLeft} label="Back to automations" onClick={goBack} />
                    <HoverCard closeDelay={150} open={switcherOpen} openDelay={150} onOpenChange={setSwitcherOpen}>
                        <HoverCardTrigger asChild>
                            <Button className="h-auto min-w-0 gap-2 rounded-full px-2 py-1 text-lg font-semibold" variant="ghost">
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

            {/* Stop — the high-friction confirm that unlocks editing. */}
            <StopAutomationDialog open={stopOpen} onConfirm={handleStop} onOpenChange={setStopOpen} />

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
