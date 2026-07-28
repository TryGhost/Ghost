import type {BadgeProps} from '@tryghost/shade/components';
import type {AutomationRun, RunStatus} from './mock';

// Shared member-run presentation data, so the dashboard and surface concepts
// describe a run's status + progress identically. The surface concept aligned
// these to Shade first; this lifts them into one place. The StatusPill component
// lives in ./status-pill (kept separate so this stays a pure, non-component
// module — the react-refresh/only-export-components rule).
//
// Each run status maps to a Shade Badge variant straight from Storybook for
// shape + tint (completed = `success`, exited_early = `warning`); in_progress
// isn't a Storybook variant so it reuses the base chrome on the bg-blue/20 ramp.
//
// The one deviation from the stock variants: in light mode the foreground text
// is dropped to the -800 stop (the values the canvas concept uses) so it clears
// contrast on the pale /20 tint. The Shade palette is absolute (it doesn't flip
// per mode) and there's no flipping tinted-text token, so a scoped `dark:`
// override is the only way to darken light while leaving the dark badges — which
// already read well — exactly as Storybook has them.
export const runStatusMeta: Record<RunStatus, {label: string; variant: BadgeProps['variant']; className?: string}> = {
    in_progress: {label: 'In progress', variant: 'secondary', className: 'border-transparent bg-blue/20 text-blue-800 dark:text-blue'},
    completed: {label: 'Completed', variant: 'success', className: 'text-green-800 dark:text-green'},
    exited_early: {label: 'Exited early', variant: 'warning', className: 'text-yellow-800 dark:text-yellow-600'}
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
