import type { AutomationRunHistory } from '@tryghost/admin-x-framework/api/automation-run-history';
import { formatNumber } from '@tryghost/shade/utils';
import { historyEmailPreview, type HistoryEmailPreview } from './history-email-preview';

export type HistoryCardState = 'occurred' | 'pending' | 'planned' | 'exited' | 'failed' | 'unknown';
export type HistoryTimestamp = {
  label: string;
  value: string;
  estimated?: boolean;
  related?: { label: string; value: string };
};
export type HistoryCardData = {
  id: string;
  kind: 'trigger' | 'wait' | 'email' | 'unavailable' | 'end' | 'event';
  title: string;
  state: HistoryCardState;
  statusLabel: string;
  timestamp?: HistoryTimestamp;
  details: string[];
  email?: HistoryEmailPreview;
  executionTimestamp?: HistoryTimestamp;
};

const exitReasons: Record<string, string> = {
  failed: 'Step failed',
  'automation disabled': 'Automation turned off',
  'member changed status': 'Member changed subscription status',
  // Core also uses this status for a missing member; do not infer which happened.
  'member unsubscribed': 'Member unavailable or unsubscribed',
};
const exitReason = (status: string) =>
  Object.hasOwn(exitReasons, status) ? exitReasons[status] : undefined;

export const waitDuration = (hours: number | null): string | null => {
  if (hours === null || !Number.isFinite(hours) || hours <= 0) {
    return null;
  }
  const days = hours % 24 === 0;
  const value = days ? hours / 24 : hours;
  const unit = days ? (value === 1 ? 'day' : 'days') : value === 1 ? 'hour' : 'hours';
  return `${formatNumber(value, { maximumFractionDigits: 20 })} ${unit}`;
};

const mapStep = (
  step: AutomationRunHistory['steps'][number],
  hasExitEvent: boolean,
): HistoryCardData => {
  const reason = exitReason(step.status);
  const state: HistoryCardState =
    step.status === 'finished'
      ? 'occurred'
      : step.status === 'pending'
        ? 'pending'
        : reason
          ? 'exited'
          : 'unknown';
  const details: string[] = [];
  let title = 'Step details unavailable';
  const kind =
    step.action?.type === 'wait'
      ? 'wait'
      : step.action?.type === 'send_email'
        ? 'email'
        : 'unavailable';
  if (step.action?.type === 'wait') {
    const duration = waitDuration(step.action.data.wait_hours);
    title = duration
      ? `${state === 'occurred' ? 'Waited' : state === 'pending' ? 'Waiting' : 'Wait'} ${duration}`
      : 'Wait';
    if (!duration) {
      details.push('Wait duration unavailable.');
    }
  } else if (kind === 'email') {
    title = state === 'occurred' ? 'Sent email' : 'Send email';
  }

  let timestamp: HistoryCardData['timestamp'];
  if (state === 'pending') {
    timestamp = { label: kind === 'wait' ? 'ends' : 'est.', value: step.ready_at, estimated: true };
  } else if (state === 'occurred' || (state === 'exited' && !hasExitEvent)) {
    const label = state === 'occurred' ? 'Completed' : 'Stopped';
    if (step.finished_at) {
      timestamp = { label, value: step.finished_at };
    } else {
      details.push(`${state === 'occurred' ? 'Completion' : 'Stop'} time unavailable.`);
    }
  } else if (state === 'unknown') {
    details.push(`Recorded status: ${step.status || 'unavailable'}.`);
  }

  let executionTimestamp: HistoryCardData['executionTimestamp'];
  if (kind === 'email' && (step.email_sent_at || step.email_delivered_at)) {
    // Delivery evidence is stronger than submission. A send can succeed before
    // the scheduler commits the step, so preserve its recorded status separately.
    title = step.email_delivered_at ? 'Received email' : 'Sent email';
    executionTimestamp = state !== 'occurred' ? timestamp : undefined;
    timestamp = step.email_delivered_at
      ? {
          label: 'Delivered',
          value: step.email_delivered_at,
          related: step.email_sent_at ? { label: 'Sent', value: step.email_sent_at } : undefined,
        }
      : { label: 'Sent', value: step.email_sent_at! };
  } else if (kind === 'email' && state === 'occurred' && timestamp) {
    // Older servers/records still establish a successful send through a finished
    // email step; its completion is the best available send timestamp.
    timestamp = { ...timestamp, label: 'Sent' };
  }

  return {
    id: `step:${step.id}`,
    kind,
    title,
    state:
      hasExitEvent && state === 'exited' && (step.email_sent_at || step.email_delivered_at)
        ? 'occurred'
        : state,
    timestamp,
    executionTimestamp,
    details,
    email:
      step.action?.type === 'send_email'
        ? historyEmailPreview(step.action.data.email_subject, step.action.data.email_lexical)
        : undefined,
    statusLabel:
      state === 'occurred'
        ? 'Completed'
        : state === 'pending'
          ? 'Pending'
          : state === 'exited'
            ? hasExitEvent
              ? 'Stopped'
              : reason!
            : 'Status unavailable',
  };
};

const mapEnd = (history: AutomationRunHistory): HistoryCardData => {
  const base = { id: `end:${history.id}`, kind: 'end' as const };
  // An earlier stopped step must not explain an unknown final outcome.
  const lastStep = history.steps.at(-1);
  const reason = exitReason(lastStep?.status ?? '');
  switch (history.status) {
    case 'completed':
      return {
        ...base,
        title: 'Completed',
        state: 'occurred',
        statusLabel: 'Completed',
        details: [],
      };
    case 'exited_early':
      return {
        ...base,
        kind: 'event',
        title:
          lastStep?.status === 'failed'
            ? lastStep.action?.type === 'send_email'
              ? 'Email step failed'
              : lastStep.action?.type === 'wait'
                ? 'Wait step failed'
                : 'Step failed'
            : (reason ?? 'Exited early'),
        state: lastStep?.status === 'failed' ? 'failed' : 'exited',
        statusLabel: 'Exited early',
        // This is the recorded step's stop time, not a separate run-end event.
        timestamp:
          reason && lastStep?.finished_at
            ? { label: 'Step stopped', value: lastStep.finished_at }
            : undefined,
        details: [],
      };
    case 'in_progress':
      return {
        ...base,
        title: 'End of automation',
        state: 'planned',
        statusLabel: 'Not reached',
        details: [],
      };
    case 'unclassified':
      return {
        ...base,
        title: 'Outcome unavailable',
        state: 'unknown',
        statusLabel: 'Unclassified',
        details: ['The recorded steps do not establish how this run ended.'],
      };
  }
};

export const mapRunHistory = (
  history: AutomationRunHistory,
  planned: HistoryCardData[] = [],
): HistoryCardData[] => [
  {
    id: `entry:${history.id}`,
    kind: 'trigger',
    title: 'Entered automation',
    state: 'occurred',
    statusLabel: 'Entered',
    timestamp: { label: 'Entered', value: history.created_at },
    details: [],
  },
  // API order describes recorded history, not edges in the current editing graph.
  // Keep unknown/email steps in place rather than joining across omitted records.
  ...history.steps.map((step, index) =>
    mapStep(step, history.status === 'exited_early' && index === history.steps.length - 1),
  ),
  ...planned,
  mapEnd(history),
];
