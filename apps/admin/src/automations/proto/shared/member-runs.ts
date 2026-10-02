import type { BadgeProps } from '@tryghost/shade/components';
import { formatTimestamp } from '@tryghost/shade/utils';
import type { AutomationRun, ExitReason, RunStatus } from './mock';

// Shared member-run presentation data, so everything describing a run's status +
// progress says it identically. Deliberately a pure, non-component module (the
// react-refresh/only-export-components rule), which is why the glyphs live
// separately in ./run-glyphs.
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
export const runStatusMeta: Record<
  RunStatus,
  { label: string; variant: BadgeProps['variant']; className?: string }
> = {
  in_progress: {
    label: 'In progress',
    variant: 'secondary',
    className: 'border-transparent bg-blue/20 text-blue-800 dark:text-blue',
  },
  completed: {
    label: 'Completed',
    variant: 'success',
    className: 'text-green-800 dark:text-green',
  },
  exited_early: {
    label: 'Exited early',
    variant: 'warning',
    className: 'text-yellow-800 dark:text-yellow-600',
  },
};

// How each exit reason reads. Kept beside the status labels so a run's outcome is
// described identically wherever it surfaces, and separate from the identifiers
// so the wording can change without touching the data.
//
// EXIT_REASONS is the ordered list — used for the filter options, so the order
// here is the order they're offered in.
export const EXIT_REASONS: { id: ExitReason; label: string }[] = [
  { id: 'failed', label: 'Delivery failed' },
  { id: 'unsubscribed', label: 'Unsubscribed' },
  { id: 'upgraded', label: 'Upgraded to paid' },
  { id: 'ended_by_publisher', label: 'Ended by publisher' },
];

export const exitReasonLabel = (reason: ExitReason): string =>
  EXIT_REASONS.find((entry) => entry.id === reason)?.label ?? 'Exited early';

// A run the system ended, rather than the member. The only exit the UI escalates,
// because it's the one a publisher can act on. Read from the run's own reason
// rather than from its steps: a step's `failed` flag says WHICH send broke, but
// the run-level reason is what decides how the run reads.
export const runFailed = (run: AutomationRun): boolean => run.exit_reason === 'failed';

// e.g. "45% complete", or "25% complete - Unsubscribed" when exited early.
export const runProgress = (run: AutomationRun): string => {
  const total = run.steps.length;
  const done = run.steps.filter((step) => step.state === 'done').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  if (run.status === 'exited_early' && run.exit_reason) {
    return `${pct}% complete - ${exitReasonLabel(run.exit_reason)}`;
  }
  return `${pct}% complete`;
};

// A short "where are they now" line for under a member's name, derived from the
// run's steps (replaces the raw progress %):
//   exited_early → the exit reason ("Unsubscribed", "Upgraded to paid")
//   waiting      → "Waiting for email N" (the next email after the current wait)
//   sending      → "Sending email N" (a send_email step is the current frontier)
//   otherwise    → the most recent completed step ("Opened email 1", "Waited 3 days")
// `actions` is the automation's ordered action list, used to number the emails.
export const latestActivity = (
  run: AutomationRun,
  actions: ReadonlyArray<{ id: string; type: string }>,
): string => {
  if (run.status === 'exited_early') {
    return run.exit_reason ?? 'Exited early';
  }

  // 1-based position of each send_email action → "email 1", "email 2", ...
  const emailNumber = new Map<string, number>();
  let sent = 0;
  actions.forEach((action) => {
    if (action.type === 'send_email') {
      emailNumber.set(action.id, (sent += 1));
    }
  });

  const current = run.steps.find((step) => step.state === 'current');
  if (current) {
    const currentIndex = actions.findIndex((action) => action.id === current.action_id);
    const currentAction = currentIndex >= 0 ? actions[currentIndex] : undefined;
    if (currentAction?.type === 'wait') {
      const nextEmail = actions
        .slice(currentIndex + 1)
        .find((action) => action.type === 'send_email');
      const num = nextEmail && emailNumber.get(nextEmail.id);
      return num ? `Waiting for email ${num}` : 'Waiting';
    }
    const num = emailNumber.get(current.action_id);
    if (num) {
      return `Sending email ${num}`;
    }
  }

  // Fall back to the last thing that actually happened.
  const lastDone = [...run.steps].reverse().find((step) => step.state === 'done' && !!step.detail);
  if (lastDone?.detail) {
    const verb = lastDone.detail.split(' · ')[0].split(' — ')[0]; // "Opened", "Delivered", "Waited 3 days"
    const num = emailNumber.get(lastDone.action_id);
    return num ? `${verb} email ${num}` : verb;
  }

  return run.status === 'completed' ? 'Completed' : 'Enrolled';
};

// Deterministic "now" so the relative "started" times stay stable across
// reviews — same fixed clock the shared automations list uses.
const NOW_MS = new Date('2026-07-21T09:12:00Z').getTime();

// Compact "started" label: 2m / 2h / 2d ago, then "Jul 2" once it's a week out.
// Shade's formatTimestamp does the wording — "5 min ago", "Yesterday", "3 days
// ago", then a short date — so runs read the way timestamps read everywhere else
// in Ghost. This used to be a hand-rolled ladder with its own vocabulary ("5m
// ago", "3d ago") and its own month names.
//
// The shift is what lets the two coexist. Fixtures are authored against a fixed
// clock so a scenario reads identically on any day, but formatTimestamp measures
// against the real one — so each timestamp is moved by the distance between the
// two before being handed over. A run authored two hours before the fixed clock
// still reads "2 hr ago" today, and still will next month.
const CLOCK_OFFSET_MS = Date.now() - NOW_MS;

// Exported because anything else showing a fixture time has to apply the same
// shift, or the same run reads "2 hr ago" in the list and shows last month's date
// when you open it.
export const toRealClock = (iso: string): string =>
  new Date(new Date(iso).getTime() + CLOCK_OFFSET_MS).toISOString();

export const startedLabel = (iso: string): string => formatTimestamp(toRealClock(iso));
