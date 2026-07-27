import React, {useEffect, useRef, useState} from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyIndicator, HoverCard, HoverCardContent, HoverCardTrigger, Input, Kbd, Label} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {getScenario, mockAutomations} from '@/automations/proto/shared/mock';
import {OverviewPanel, RunsPanel} from './panels';
import {SurfaceEditCanvas as FloatEditCanvas} from '@/automations/proto/surface/edit-canvas';
import {SurfaceFlowCanvas as FloatFlowCanvas} from '@/automations/proto/surface/flow-canvas';
import {useVersionLink} from '@/automations/proto/shared/use-version-link';

type LiveStatus = 'active' | 'inactive';
type SaveState = 'saved' | 'saving';
type RailPanel = 'overview' | 'runs' | 'more' | null;
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
interface RailButtonProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

const RailButton = React.forwardRef<HTMLButtonElement, RailButtonProps>(({icon: Icon, label, active, onClick}, ref) => (
    <Button
        ref={ref}
        aria-label={label}
        className={cn(active && 'bg-muted')}
        size="icon"
        variant="ghost"
        onClick={onClick}
    >
        <Icon strokeWidth={2} />
    </Button>
));
RailButton.displayName = 'RailButton';

const STOP_OPTIONS: {value: StopScope; title: string; description: string}[] = [
    {value: 'new', title: 'Stop new runs', description: 'New members stop enrolling. Members already in the flow finish their journey.'},
    {value: 'all', title: 'Stop all runs', description: 'New members stop enrolling, and members currently in the flow are removed.'}
];

const STOP_CONFIRM_PHRASE = 'stop all';

// Deliberately high-friction, mirroring Resend but folded into one dialog: pick
// a scope, then type the confirm phrase and submit with ⌘/Ctrl+Return. Stopping
// is what unlocks editing a live automation, so it shouldn't be a one-click
// accident.
const StopAutomationDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (scope: StopScope) => void;
}> = ({open, onOpenChange, onConfirm}) => {
    const [scope, setScope] = useState<StopScope>('new');
    const [confirmText, setConfirmText] = useState('');
    const canSubmit = confirmText.trim().toLowerCase() === STOP_CONFIRM_PHRASE;

    // Reset back to defaults every time the dialog opens.
    useEffect(() => {
        if (open) {
            setScope('new');
            setConfirmText('');
        }
    }, [open]);

    const submit = () => {
        if (canSubmit) {
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

                <div className="flex flex-col gap-2">
                    {STOP_OPTIONS.map((option) => {
                        const selected = scope === option.value;
                        return (
                            <Button
                                key={option.value}
                                aria-pressed={selected}
                                className={cn('h-auto w-full flex-col items-start gap-1 p-3 text-left whitespace-normal', selected && 'border-foreground bg-muted')}
                                variant="outline"
                                onClick={() => setScope(option.value)}
                            >
                                <span className="text-md font-semibold">{option.title}</span>
                                <span className="text-sm font-normal text-muted-foreground">{option.description}</span>
                            </Button>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="stop-confirm">
                        Type <span className="font-semibold text-foreground">stop all</span> to confirm
                    </Label>
                    <Input
                        autoFocus
                        id="stop-confirm"
                        placeholder="stop all"
                        value={confirmText}
                        onChange={e => setConfirmText(e.target.value)}
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                e.preventDefault();
                                submit();
                            }
                        }}
                    />
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        Press <Kbd>⌘</Kbd><Kbd>↵</Kbd> to submit
                    </span>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button disabled={!canSubmit} variant="destructive" onClick={submit}>Stop automation</Button>
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

    const [railPanel, setRailPanel] = useState<RailPanel>(null);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [liveStatus, setLiveStatus] = useState<LiveStatus>(scenario?.automation.status ?? 'active');
    const [dirty, setDirty] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>('saved');
    const [startOpen, setStartOpen] = useState(false);
    const [stopOpen, setStopOpen] = useState(false);
    const [draft, setDraft] = useState<AutomationDetail | null>(null);
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const railRef = useRef<HTMLDivElement>(null);

    // Canvas focus tracks the rail: Runs focuses a member (the first, on
    // entry), anything else (Overview open, or nothing open) clears it back to
    // the generic preview. Runs off the panel state itself, not the toggle
    // click, so it stays correct no matter how the panel closes (Escape,
    // outside click, switching to Overview, ...). Kept above the early return
    // below — hooks must run unconditionally on every render.
    useEffect(() => {
        if (railPanel !== 'runs') {
            setSelectedMemberId(null);
        }
    }, [railPanel]);

    // Overview/Runs render as plain in-flow panels (not Radix popovers), so we
    // dismiss them ourselves: any pointerdown outside the rail, or Escape, closes
    // the open flyout. The ⋯ menu is a Radix DropdownMenu and dismisses itself, so
    // it's excluded here. Kept above the early return — hooks run unconditionally.
    useEffect(() => {
        if (railPanel !== 'overview' && railPanel !== 'runs') {
            return;
        }
        const onPointerDown = (event: PointerEvent) => {
            if (event.target instanceof Node && !railRef.current?.contains(event.target)) {
                setRailPanel(null);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setRailPanel(null);
            }
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [railPanel]);

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
    // Editability follows the live status, Resend-style: a live automation is a
    // read-only preview, a stopped one is fully editable.
    const isEditable = liveStatus === 'inactive';
    const selectedRun = selectedMemberId ? scenario.runs.find(r => r.id === selectedMemberId) ?? null : null;
    const activeDraft = draft ?? automation;

    // One controlled slot — railPanel — holds whichever rail flyout is open, so
    // at most one shows at a time. Overview/Runs toggle it directly on click;
    // clicking straight from one to the other just reassigns the slot, so
    // switching is a single click with no dismiss race.
    const togglePanel = (panel: Exclude<RailPanel, null>) => {
        setRailPanel(current => (current === panel ? null : panel));
    };

    // The ⋯ menu shares the same slot but is a Radix DropdownMenu, so its
    // open/close comes through onOpenChange; releasing only if it still holds the
    // slot keeps a stale close from clobbering a flyout opened right after.
    const moreOpenChange = (open: boolean) => {
        setRailPanel(current => (open ? 'more' : (current === 'more' ? null : current)));
    };

    const handleDraftChange = (next: AutomationDetail) => {
        setDraft(next);
        setDirty(true);
        setSaveState('saving');
        window.setTimeout(() => setSaveState('saved'), 700);
    };

    // Start — take the (edited, stopped) automation live. Low-friction on
    // purpose; the friction lives on Stop.
    const confirmStart = () => {
        setStartOpen(false);
        setDirty(false);
        setLiveStatus('active');
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
        <div className="fixed inset-0 z-50 flex flex-col bg-background" data-testid="float-detail">
            {/* No boxed header, no docked pane — every control floats directly on
                the canvas, the way the post editor floats its own chrome over the
                document. */}
            <div className="relative min-h-0 flex-1 overflow-hidden bg-muted/30">
                {isEditable ? (
                    <FloatEditCanvas draft={activeDraft} onChange={handleDraftChange} />
                ) : (
                    <FloatFlowCanvas automation={automation} selectedRun={selectedRun} />
                )}

                {/* Top-left — back arrow, then title + status. Title and status live in
                    one trigger (the switcher) so hovering the whole block, not just the
                    name, opens it. Back arrow is a separate button since it does
                    something else (leave to the list); Inline keeps both vertically
                    centered on the same row. */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
                    <Inline align="center" gap="sm">
                        <RailButton icon={LucideIcon.ArrowLeft} label="Back to automations" onClick={goBack} />
                        <HoverCard closeDelay={150} open={switcherOpen} openDelay={150} onOpenChange={setSwitcherOpen}>
                            <HoverCardTrigger asChild>
                                <Button className="h-auto gap-2 rounded-full px-2 py-1 text-lg font-semibold" variant="ghost">
                                    {automation.name}
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

                    {/* Rail — analytics + actions, present whether live or stopped. The
                        button column and the open flyout sit side by side (items-start),
                        so the flyout lands just right of the buttons and top-aligned with
                        the rail — under the title — and never covers the buttons, so
                        switching straight from one flyout to another is a single click.
                        No Edit button: editability is driven by live status, not a toggle. */}
                    <div ref={railRef} className="flex items-start gap-3">
                        <div className="flex flex-col gap-1">
                            <RailButton active={railPanel === 'overview'} icon={LucideIcon.ChartNoAxesColumn} label="Overview" onClick={() => togglePanel('overview')} />
                            <RailButton active={railPanel === 'runs'} icon={LucideIcon.Users} label="Runs" onClick={() => togglePanel('runs')} />
                            {/* modal={false} so the open menu doesn't block pointer events to
                                the other rail buttons — that block is what forces an extra
                                click when switching from the menu to a flyout. */}
                            <DropdownMenu modal={false} open={railPanel === 'more'} onOpenChange={moreOpenChange}>
                                <DropdownMenuTrigger asChild>
                                    <RailButton active={railPanel === 'more'} icon={LucideIcon.MoreHorizontal} label="More actions" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" side="right">
                                    <DropdownMenuItem>
                                        <LucideIcon.Copy /> Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                                        <LucideIcon.Trash2 /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {(railPanel === 'overview' || railPanel === 'runs') && (
                            <div className="flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-md border border-border/60 bg-surface-elevated-2 shadow-md dark:border-border/30">
                                {railPanel === 'overview' ? (
                                    <OverviewPanel scenario={scenario} />
                                ) : (
                                    <RunsPanel scenario={scenario} selectedMemberId={selectedMemberId} onSelectMember={setSelectedMemberId} />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Top-right — the one primary action for the current lifecycle state:
                    Stop while live (opens the high-friction confirm), Start once stopped.
                    Stopped also shows the autosave indicator, since that's the editable
                    state. Floats over the canvas like the post editor's Publish. */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
                    {isEditable ? (
                        <>
                            <span className="text-xs text-muted-foreground">{workingText}</span>
                            <Button onClick={() => setStartOpen(true)}>Start</Button>
                        </>
                    ) : (
                        <Button onClick={() => setStopOpen(true)}>Stop</Button>
                    )}
                </div>
            </div>

            {/* Start confirmation — one click of friction before going live. */}
            <Dialog open={startOpen} onOpenChange={setStartOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Start this automation?</DialogTitle>
                        <DialogDescription>
                            This takes your flow live and starts enrolling members who match the trigger.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStartOpen(false)}>Cancel</Button>
                        <Button onClick={confirmStart}>Start</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Stop — the high-friction confirm that unlocks editing. */}
            <StopAutomationDialog open={stopOpen} onConfirm={handleStop} onOpenChange={setStopOpen} />
        </div>
    );
};

export default AutomationFloat;
export const Component = AutomationFloat;
