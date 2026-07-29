import React, {useEffect, useState} from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyIndicator, HoverCard, HoverCardContent, HoverCardTrigger, Input, Kbd, Label} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {getScenario, mockAutomations} from '@/automations/proto/shared/mock';
import {CanvasSidePanel} from './panels';
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

    // The Overview + Runs card is always docked now (no toolbar toggles), so the
    // only view state left is whether we're editing the flow. Editing is entered
    // from the header and only when stopped.
    const [editing, setEditing] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [liveStatus, setLiveStatus] = useState<LiveStatus>(scenario?.automation.status ?? 'active');
    const [dirty, setDirty] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>('saved');
    const [startOpen, setStartOpen] = useState(false);
    const [stopOpen, setStopOpen] = useState(false);
    const [draft, setDraft] = useState<AutomationDetail | null>(null);
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);

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
    // Editing can only happen once stopped, Resend-style. Edit is entered from
    // the header — its button only appears when stopped — so the editable canvas
    // replaces the read-only preview; no "stop first" lock is needed since you
    // can't reach edit while live.
    const isEditable = liveStatus === 'inactive';
    const showEditCanvas = editing && isEditable;
    const selectedRun = selectedMemberId ? scenario.runs.find(r => r.id === selectedMemberId) ?? null : null;
    const activeDraft = draft ?? automation;

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
        setEditing(false); // leave the edit canvas — a live automation is read-only
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
        <div className="fixed inset-0 z-50 flex bg-background" data-testid="float-detail">
            {/* Persistent left card — back arrow + title pinned at the top (kept
                across view and edit), then the Overview + Runs content scrolling
                below. Replaces the old floating rail + Overview/Runs flyouts. */}
            <aside className="flex w-[480px] shrink-0 flex-col border-r border-border-default bg-background">
                {/* Back arrow + title/status switcher stay at the top of the card.
                    Title and status live in one trigger so hovering the whole block
                    opens the switcher; the back arrow is separate (leaves to the list). */}
                <Inline align="center" className="shrink-0 px-4 pt-4" gap="sm">
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
                <CanvasSidePanel scenario={scenario} selectedMemberId={selectedMemberId} onSelectMember={setSelectedMemberId} />
            </aside>

            {/* Canvas — fills the rest; the lifecycle chrome floats top-right over it. */}
            <div className="relative min-h-0 flex-1 overflow-hidden bg-muted/30">
                {showEditCanvas ? (
                    <FloatEditCanvas draft={activeDraft} onChange={handleDraftChange} />
                ) : (
                    <FloatFlowCanvas automation={automation} selectedRun={selectedRun} />
                )}

                {/* Top-right — autosave indicator (while editing), the ⋯ actions menu,
                    the Edit/Done toggle (only when stopped — a live automation is
                    read-only), then the one primary lifecycle action: Stop while live
                    (high-friction confirm), Start once stopped. */}
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
                    {/* Edit lives in the header now (not a rail); only shown once
                        stopped, and toggles to Done while editing. */}
                    {isEditable && (
                        editing ? (
                            <Button variant="outline" onClick={() => setEditing(false)}>Done</Button>
                        ) : (
                            <Button variant="outline" onClick={() => setEditing(true)}>
                                <LucideIcon.Pencil /> Edit
                            </Button>
                        )
                    )}
                    {isEditable ? (
                        <Button onClick={() => setStartOpen(true)}>Start</Button>
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
