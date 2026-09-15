import type { AutomationRunHistory } from '@tryghost/admin-x-framework/api/automation-run-history';
import { formatNumber } from '@tryghost/shade/utils';
import { historyEmailPreview, type HistoryEmailPreview } from './history-email-preview';

export type HistoryCardState = 'occurred' | 'pending' | 'planned' | 'exited' | 'unknown';
export type HistoryCardData = {
  id: string;
  kind: 'trigger' | 'wait' | 'email' | 'unavailable' | 'end';
  title: string;
  state: HistoryCardState;
  statusLabel: string;
  timestamp?: { label: string; value: string; related?: { label: string; value: string } };
  details: string[];
  email?: HistoryEmailPreview;
  executionTimestamp?: { label: string; value: string };
};

const exitLabels: Record<string, string> = {
  failed: 'Failed',
  'automation disabled': 'Automation disabled',
  'member changed status': 'Member changed status',
  'member unsubscribed': 'Member unsubscribed',
};

export const waitDuration = (hours: number | null): string | null => {
  if (hours === null || !Number.isFinite(hours) || hours <= 0) {
    return null;
  }
  const days = hours % 24 === 0;
  const value = days ? hours / 24 : hours;
  const unit = days ? (value === 1 ? 'day' : 'days') : value === 1 ? 'hour' : 'hours';
  return `${formatNumber(value, { maximumFractionDigits: 20 })} ${unit}`;
};

const mapStep = (step: AutomationRunHistory['steps'][number]): HistoryCardData => {
  const exitLabel = Object.hasOwn(exitLabels, step.status) ? exitLabels[step.status] : undefined;
  const state: HistoryCardState =
    step.status === 'finished'
      ? 'occurred'
      : step.status === 'pending'
        ? 'pending'
        : exitLabel
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
    timestamp = { label: kind === 'wait' ? 'Resumes' : 'Scheduled', value: step.ready_at };
  } else if (state === 'occurred' || state === 'exited') {
    const label = state === 'occurred' ? 'Completed' : 'Stopped';
    if (step.finished_at) {
      timestamp = { label, value: step.finished_at };
    } else {
      details.push(`${state === 'occurred' ? 'Completion' : 'Stop'} time unavailable.`);
    }
  } else {
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
    state,
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
            ? exitLabel!
            : 'Status unavailable',
  };
};

const mapEnd = (history: AutomationRunHistory): HistoryCardData => {
  const base = { id: `end:${history.id}`, kind: 'end' as const };
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
        title: 'Exited early',
        state: 'exited',
        statusLabel: history.failed ? 'Failed' : 'Exited early',
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
  ...history.steps.map(mapStep),
  ...planned,
  mapEnd(history),
];
