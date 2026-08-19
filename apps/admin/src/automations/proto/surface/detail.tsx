import React, {useEffect, useState} from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyIndicator, HoverCard, HoverCardContent, HoverCardTrigger, Input, Kbd, Label, Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {getScenario, mockAutomations} from '@/automations/proto/shared/mock';
import {SurfaceAnalyticsPane} from './analytics-pane';
import {SurfaceEditCanvas} from './edit-canvas';
import {SurfaceFlowCanvas} from './flow-canvas';
import {useVersionLink} from '@/automations/proto/shared/use-version-link';

type Mode = 'view' | 'edit';
type LiveStatus = 'active' | 'inactive';
type SaveState = 'saved' | 'saving';
type StopScope = 'new' | 'all';

// Fixed left-pane width so it can cleanly slide out / in without reflowing.
const LEFT_PANE = 'w-[480px]';

// Matches the member-run badges (shared StatusPill): the Shade Badge chrome
// (rounded-xs, bordered, font-medium) rather than a rounded-full uppercase pill,
// with Live reusing the same green treatment as the "completed" run badge and
// Off a neutral secondary badge.
const StatusPill: React.FC<{status: LiveStatus}> = ({status}) => (
    status === 'active'
        ? (
            <Badge className="font-medium whitespace-nowrap text-green-800 dark:text-green" variant="success">On</Badge>
        )
        : (
            <Badge className="font-medium whitespace-nowrap" variant="secondary">Off</Badge>
        )
);

const STOP_OPTIONS: {value: StopScope; title: string; description: string}[] = [
    {value: 'new', title: 'Stop new runs', description: 'New members stop enrolling. Members already in the flow finish their journey.'},
    {value: 'all', title: 'Stop all runs', description: 'New members stop enrolling, and members currently in the flow are removed.'}
];

const STOP_CONFIRM_PHRASE = 'stop all';

// Deliberately high-friction, mirroring Resend but folded into one dialog: pick
// a scope, then type the confirm phrase and submit with ⌘/Ctrl+Return. Stopping
// is what unlocks editing a live automation, so it shouldn't be a one-click
// accident. (Kept self-contained here rather than shared with float so the two
// concepts stay independent while the lifecycle is still being explored.)
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
                        id="stop-confirm"
                        placeholder="stop all"
                        value={confirmText}
                        autoFocus
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
 * Surface concept — single-surface automation detail, Resend-style lifecycle.
 *
 * One surface, no navigation between modes: entering edit doesn't swap the page,
 * it animates — the left analytics pane slides out and the flow canvas expands to
 * fill. The ← back arrow means "leave to the list" in both modes, so nothing about
 * the mode switch reads as a page change.
 *
 * A live automation is read-only: editing is gated behind stopping. The one
 * primary action on the right adapts to the lifecycle — Stop while live (a
 * high-friction confirm that unlocks editing), Start once stopped — and the Edit
 * button is disabled while live, telling you to stop first. Editing mutates a
 * local AutomationDetail draft (autosaved) through the real framework graph
 * helpers; Start takes the stopped, edited flow back live.
 */
const AutomationSurface: React.FC = () => {
    const {id} = useParams<{id: string}>();
    const navigate = useNavigate();
    const toVersioned = useVersionLink();

    const scenario = id ? getScenario(id) : undefined;

    const [mode, setMode] = useState<Mode>('view');
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [liveStatus, setLiveStatus] = useState<LiveStatus>(scenario?.automation.status ?? 'active');
    const [dirty, setDirty] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>('saved');
    const [startOpen, setStartOpen] = useState(false);
    const [stopOpen, setStopOpen] = useState(false);
    const [draft, setDraft] = useState<AutomationDetail | null>(null);
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const [lockOpen, setLockOpen] = useState(false);

    const goBack = () => navigate(toVersioned('/automations-proto/surface'));

    if (!scenario) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
                <EmptyIndicator title="Automation not found" />
                <Button variant="outline" onClick={goBack}>Back to automations</Button>
            </div>
        );
    }

    const {automation} = scenario;
    const isEdit = mode === 'edit';
    // Editing can only happen once stopped, Resend-style. The Edit button is
    // disabled while live and the primary action becomes Stop.
    const isEditable = liveStatus === 'inactive';
    const selectedRun = selectedMemberId ? scenario.runs.find(r => r.id === selectedMemberId) ?? null : null;
    const activeDraft = draft ?? automation;

    // Every flow edit updates the local draft and runs the autosave beat.
    const handleDraftChange = (next: AutomationDetail) => {
        setDraft(next);
        setDirty(true);
        setSaveState('saving');
        window.setTimeout(() => setSaveState('saved'), 700);
    };

    // Start — take the (stopped, edited) automation live. Low-friction on
    // purpose; the friction lives on Stop. Also drops out of edit mode, since a
    // live automation is read-only.
    const confirmStart = () => {
        setStartOpen(false);
        setDirty(false);
        setLiveStatus('active');
        setMode('view');
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
        <div className="fixed inset-0 z-50 flex flex-col bg-background" data-testid="surface-detail">
                {/* Persistent header — the left stays put across modes; only the right controls morph. */}
                <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-border-default bg-surface-elevated p-4">
                    <Inline align="center" gap="sm">
                        {/* Back arrow hides in edit mode — under load it reads as "exit editing",
                            so the only ways out are the deliberate Done / Start on the right. */}
                        {!isEdit && (
                            <Button aria-label="Back to automations" size="icon" variant="ghost" onClick={goBack}>
                                <LucideIcon.ArrowLeft strokeWidth={2} />
                            </Button>
                        )}
                        {isEdit ? (
                            <span className="text-lg font-semibold">{automation.name}</span>
                        ) : (
                            // Discreet flat switcher — jump straight to any other automation.
                            // Prototype-only convenience; no chevron, opens on hover. HoverCard
                            // (not DropdownMenu) is used deliberately — it has native hover-intent
                            // timing and none of the menu/focus-trap semantics that made a
                            // hand-rolled hover version of DropdownMenu flicker.
                            <HoverCard closeDelay={150} open={switcherOpen} openDelay={150} onOpenChange={setSwitcherOpen}>
                                <HoverCardTrigger asChild>
                                    <button
                                        className="-mx-2 -my-1 rounded-sm px-2 py-1 text-lg font-semibold transition-colors hover:bg-interactive-hover"
                                        type="button"
                                    >
                                        {automation.name}
                                    </button>
                                </HoverCardTrigger>
                                <HoverCardContent align="start" className="max-h-80 w-64 overflow-y-auto p-1">
                                    {mockAutomations.map(a => (
                                        <button
                                            key={a.id}
                                            className={cn(
                                                'flex w-full items-center justify-between gap-3 rounded-xs px-2 py-1.5 text-left text-control transition-colors hover:bg-interactive-hover',
                                                a.id === automation.id && 'bg-muted-foreground/10 font-medium'
                                            )}
                                            type="button"
                                            onClick={() => {
                                                setSwitcherOpen(false);
                                                if (a.id !== automation.id) {
                                                    navigate(toVersioned(`/automations-proto/surface/${a.id}`));
                                                }
                                            }}
                                        >
                                            <span className="truncate">{a.name}</span>
                                            <StatusPill status={a.status} />
                                        </button>
                                    ))}
                                </HoverCardContent>
                            </HoverCard>
                        )}
                        <StatusPill status={liveStatus} />
                    </Inline>
                    <Inline align="center" gap="sm">
                        {isEdit ? (
                            <>
                                {/* Working state anchored far-left of the actions so it never shuffles. */}
                                <span className="text-xs text-muted-foreground">{workingText}</span>
                                <Button variant="outline" onClick={() => setMode('view')}>Done</Button>
                                <Button onClick={() => setStartOpen(true)}>Start</Button>
                            </>
                        ) : (
                            <>
                                {/* Automation-level actions live in view mode (left of Edit), not
                                    buried behind edit mode. Turn-off lives on the primary Stop
                                    button now, so it's dropped from this menu. */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-label="More actions" size="icon" variant="ghost">
                                            <LucideIcon.MoreHorizontal strokeWidth={2} />
                                        </Button>
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
                                {/* Edit only appears once stopped. While live, the read-only state
                                    is taught by the floating lock on the canvas (below) rather than
                                    a disabled button here. */}
                                {isEditable && (
                                    <Button variant="outline" onClick={() => setMode('edit')}>
                                        <LucideIcon.Pencil /> Edit
                                    </Button>
                                )}
                                {/* One primary action for the current lifecycle state. */}
                                {isEditable ? (
                                    <Button onClick={() => setStartOpen(true)}>Start</Button>
                                ) : (
                                    <Button onClick={() => setStopOpen(true)}>Stop</Button>
                                )}
                            </>
                        )}
                    </Inline>
                </header>

                {/* Body — both panes stay mounted; the left collapses and the canvas expands. */}
                <div className="flex min-h-0 flex-1">
                    {/* Left — analytics pane (Phase 3). Slides out in edit mode. */}
                    <aside className={cn('shrink-0 overflow-hidden bg-background transition-[width] duration-300 ease-in-out', isEdit ? 'w-0' : `${LEFT_PANE} border-r border-border-default`)}>
                        <div className={cn(LEFT_PANE, 'h-full overflow-y-auto transition-all duration-300 ease-in-out', isEdit ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100')}>
                            <SurfaceAnalyticsPane
                                scenario={scenario}
                                selectedMemberId={selectedMemberId}
                                onSelectMember={setSelectedMemberId}
                            />
                        </div>
                    </aside>

                    {/* Right — the flow canvas. Persists across modes and expands to fill in edit. */}
                    <div className="relative min-h-0 flex-1 overflow-hidden bg-muted/30">
                        {isEdit ? (
                            <SurfaceEditCanvas draft={activeDraft} onChange={handleDraftChange} />
                        ) : (
                            <SurfaceFlowCanvas automation={automation} selectedRun={selectedRun} />
                        )}

                        {/* While live the canvas is read-only — a subtle lock in the corner
                            says so, and its popover points at Stop as the way in. Opens on
                            hover; anchored below-right so it never covers the Stop button above.
                            onOpenAutoFocus is prevented so a hover doesn't yank focus into it. */}
                        {!isEditable && (
                            <Popover open={lockOpen} onOpenChange={setLockOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        aria-label="Editing locked while live"
                                        className="absolute top-4 right-4 z-10 shadow-sm"
                                        size="icon"
                                        variant="secondary"
                                        onMouseEnter={() => setLockOpen(true)}
                                        onMouseLeave={() => setLockOpen(false)}
                                    >
                                        <LucideIcon.Lock strokeWidth={2} />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="end"
                                    className="w-auto max-w-xs p-2.5 text-sm text-muted-foreground"
                                    side="bottom"
                                    onOpenAutoFocus={e => e.preventDefault()}
                                >
                                    Stop automation to edit the workflow
                                </PopoverContent>
                            </Popover>
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

export default AutomationSurface;
export const Component = AutomationSurface;
