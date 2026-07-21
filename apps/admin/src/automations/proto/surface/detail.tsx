import React, {useState} from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyIndicator} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {getScenario} from '@/automations/proto/shared/mock';
import {SurfaceAnalyticsPane} from './analytics-pane';
import {SurfaceEditCanvas} from './edit-canvas';
import {SurfaceFlowCanvas} from './flow-canvas';
import {useVersionLink} from '@/automations/proto/shared/use-version-link';

type Mode = 'view' | 'edit';
type LiveStatus = 'active' | 'inactive';
type SaveState = 'saved' | 'saving';

// Fixed left-pane width so it can cleanly slide out / in without reflowing.
const LEFT_PANE = 'w-[420px]';

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

// Autosave reassurance — the antidote to "I saved and still lost everything".
const SaveIndicator: React.FC<{state: SaveState}> = ({state}) => (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        {state === 'saving'
            ? <><LucideIcon.Loader2 className="size-3.5 animate-spin" strokeWidth={2} /> Saving…</>
            : <><LucideIcon.Check className="size-3.5 text-green" strokeWidth={2.5} /> All changes saved</>}
    </span>
);

/**
 * Surface concept — single-surface automation detail.
 *
 * One surface, no navigation between modes: entering edit doesn't swap the page,
 * it animates — the left analytics pane slides out and the flow canvas expands to
 * fill. The header morphs in place (Edit → Done + Publish); the ← back arrow means
 * "leave to the list" in both modes, so nothing about the mode switch reads as a
 * page change.
 *
 * Edit-mode actions follow the "improved flow": the draft is always autosaved
 * (SaveIndicator), status lives in the pill + ⋯ menu (never a disabled button),
 * and one adaptive Publish is the deliberate go-live. Editing mutates a local
 * AutomationDetail draft through the real framework graph helpers.
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
    const [publishOpen, setPublishOpen] = useState(false);
    const [turnOffOpen, setTurnOffOpen] = useState(false);
    const [draft, setDraft] = useState<AutomationDetail | null>(null);

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
    const selectedRun = selectedMemberId ? scenario.runs.find(r => r.id === selectedMemberId) ?? null : null;
    const activeDraft = draft ?? automation;

    // Every flow edit updates the local draft and runs the autosave beat.
    const handleDraftChange = (next: AutomationDetail) => {
        setDraft(next);
        setDirty(true);
        setSaveState('saving');
        window.setTimeout(() => setSaveState('saved'), 700);
    };

    const confirmPublish = () => {
        setPublishOpen(false);
        setDirty(false);
        setLiveStatus('active');
    };

    const confirmTurnOff = () => {
        setTurnOffOpen(false);
        setLiveStatus('inactive');
    };

    // Adaptive primary: quiet "Published" when live with nothing to publish;
    // otherwise a single Publish action (labelled for the situation).
    const nothingToPublish = liveStatus === 'active' && !dirty;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background" data-testid="surface-detail">
            {/* Persistent header — the left stays put across modes; only the right controls morph. */}
            <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-border-default bg-surface-elevated px-4">
                <Inline align="center" gap="sm">
                    <Button aria-label="Back to automations" size="icon" variant="ghost" onClick={goBack}>
                        <LucideIcon.ArrowLeft strokeWidth={2} />
                    </Button>
                    <Inline align="center" gap="sm">
                        <button className="text-sm text-muted-foreground hover:text-foreground" type="button" onClick={goBack}>Automations</button>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-medium">{automation.name}</span>
                        <StatusPill status={liveStatus} />
                        {isEdit && <span className="ml-1"><SaveIndicator state={saveState} /></span>}
                    </Inline>
                </Inline>
                <Inline align="center" gap="sm">
                    {isEdit ? (
                        <>
                            <Button variant="outline" onClick={() => setMode('view')}>Done</Button>
                            {nothingToPublish ? (
                                <span className="inline-flex items-center gap-1.5 px-2 text-sm font-medium text-muted-foreground">
                                    <LucideIcon.Check className="size-4 text-green" strokeWidth={2.5} /> Published
                                </span>
                            ) : (
                                <Button onClick={() => setPublishOpen(true)}>
                                    {liveStatus === 'active' ? 'Publish changes' : 'Publish'}
                                </Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-label="More actions" size="icon" variant="ghost">
                                        <LucideIcon.MoreHorizontal strokeWidth={2} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {liveStatus === 'active' && (
                                        <DropdownMenuItem onClick={() => setTurnOffOpen(true)}>
                                            <LucideIcon.Power /> Turn off
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem>
                                        <LucideIcon.Copy /> Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                                        <LucideIcon.Trash2 /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setMode('edit')}>
                                <LucideIcon.Pencil /> Edit
                            </Button>
                            <Button aria-label="Settings" size="icon" variant="ghost">
                                <LucideIcon.Settings strokeWidth={2} />
                            </Button>
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
                            onSelectMember={runId => setSelectedMemberId(cur => (cur === runId ? null : runId))}
                        />
                    </div>
                </aside>

                {/* Right — the flow canvas. Persists across modes and expands to fill in edit. */}
                <div className="min-h-0 flex-1 overflow-hidden bg-muted/30">
                    {isEdit ? (
                        <SurfaceEditCanvas draft={activeDraft} onChange={handleDraftChange} />
                    ) : (
                        <SurfaceFlowCanvas automation={automation} selectedRun={selectedRun} />
                    )}
                </div>
            </div>

            {/* Publish confirmation */}
            <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{liveStatus === 'active' ? 'Publish changes?' : 'Publish automation?'}</DialogTitle>
                        <DialogDescription>
                            {liveStatus === 'active'
                                ? 'Your updated flow goes live immediately. Members already in progress continue on the version they entered on.'
                                : 'This turns the automation on and starts enrolling members who match the trigger.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
                        <Button onClick={confirmPublish}>{liveStatus === 'active' ? 'Publish changes' : 'Publish'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Turn off confirmation */}
            <Dialog open={turnOffOpen} onOpenChange={setTurnOffOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Turn off this automation?</DialogTitle>
                        <DialogDescription>
                            New members won’t be enrolled while it’s off. Your draft stays saved, so you can keep editing and publish again later.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTurnOffOpen(false)}>Cancel</Button>
                        <Button onClick={confirmTurnOff}>Turn off</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AutomationSurface;
export const Component = AutomationSurface;
