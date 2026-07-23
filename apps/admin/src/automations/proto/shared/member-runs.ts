import type {AutomationRun, RunStatus} from './mock';

// Shared member-run presentation data, so the dashboard and surface concepts
// describe a run's status + progress identically. The surface concept aligned
// these to Shade first; this lifts them into one place. The StatusPill component
// lives in ./status-pill (kept separate so this stays a pure, non-component
// module — the react-refresh/only-export-components rule).

export const runStatusMeta: Record<RunStatus, {label: string; pill: string}> = {
    in_progress: {label: 'In progress', pill: 'bg-blue/15 text-blue'},
    completed: {label: 'Completed', pill: 'bg-green/15 text-green'},
    exited_early: {label: 'Exited early', pill: 'bg-muted text-muted-foreground'}
};

// e.g. "45% complete", or "25% complete - Unsubscribed" when exited early.
export const runProgress = (run: AutomationRun): string => {
    const total = run.steps.length;
    const done = run.steps.filter(step => step.state === 'done').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    if (run.status === 'exited_early' && run.exit_reason) {
        return `${pct}% complete - ${run.exit_reason}`;
    }
    return `${pct}% complete`;
};
