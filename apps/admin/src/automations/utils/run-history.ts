import type { AutomationRunHistory } from '@tryghost/admin-x-framework/api/automation-run-history';
import { formatNumber } from '@tryghost/shade/utils';
import { emailTextExcerpt } from './history-email-preview';
import { WELCOME_EMAIL_SLUGS } from './default-welcome-email-values';

export type HistoryEmail = { subject: string | null; text: string };

export type HistoryCardState = 'occurred' | 'pending' | 'exited' | 'failed' | 'planned';
export type HistoryTimestamp = {
  label: string;
  value: string;
  estimated?: boolean;
  rangeStart?: string;
  related?: { label: string; value: string };
};
export type HistoryCardData = {
  id: string;
  kind: 'trigger' | 'wait' | 'email' | 'end' | 'event';
  title: string;
  state: HistoryCardState;
  statusLabel: string;
  timestamp?: HistoryTimestamp;
  email?: HistoryEmail;
  executionTimestamp?: HistoryTimestamp;
};

type Step = AutomationRunHistory['steps'][number];
const stepStates = {
  pending: { state: 'pending', label: 'Pending' },
  finished: { state: 'occurred', label: 'Completed' },
  failed: { state: 'exited', label: 'Step failed' },
  'automation disabled': { state: 'exited', label: 'Ended by publisher' },
  'member changed status': { state: 'exited', label: 'Member changed subscription status' },
  // The server also uses this status for a missing member.
  'member unsubscribed': { state: 'exited', label: 'Unsubscribed' },
} as const satisfies Record<Step['status'], { state: HistoryCardState; label: string }>;

function stepContent(step: Step, state: (typeof stepStates)[Step['status']]['state']) {
  const action = step.action;
  switch (action.type) {
    case 'wait': {
      const duration = waitDuration(action.data.wait_hours);
      if (!duration) {
        throw new Error('Invalid recorded wait duration');
      }
      const verbs = {
        occurred: 'Waited',
        pending: 'Waiting',
        exited: 'Wait',
      };
      return { kind: 'wait' as const, title: `${verbs[state]} ${duration}` };
    }
    case 'send_email':
      return {
        kind: 'email' as const,
        title: state === 'occurred' ? 'Sent email' : 'Send email',
        email: {
          subject: action.data.email_subject,
          text: emailTextExcerpt(action.data.email_lexical),
        },
      };
    default:
      throw new Error(`Unknown history action: ${String(action satisfies never)}`);
  }
}

function finishedAt(step: Step): string {
  if (!step.finished_at) {
    throw new Error('A stopped step must have a finish timestamp');
  }
  return step.finished_at;
}

export const waitDuration = (hours: number | null): string | null => {
  if (hours === null || !Number.isFinite(hours) || hours <= 0) {
    return null;
  }
  const days = hours % 24 === 0;
  const value = days ? hours / 24 : hours;
  const singular = days ? 'day' : 'hour';
  const unit = value === 1 ? singular : `${singular}s`;
  return `${formatNumber(value, { maximumFractionDigits: 20 })} ${unit}`;
};

const mapStep = (
  step: AutomationRunHistory['steps'][number],
  hasExitEvent: boolean,
): HistoryCardData => {
  const { state, label } = stepStates[step.status];
  const statusLabel = hasExitEvent ? 'Stopped' : label;
  const content = stepContent(step, state);
  const { kind } = content;
  let { title } = content;

  let timestamp: HistoryCardData['timestamp'];
  if (state === 'pending') {
    timestamp = { label: kind === 'wait' ? 'ends' : 'est.', value: step.ready_at, estimated: true };
  } else if (state === 'occurred' || (state === 'exited' && !hasExitEvent)) {
    const timestampLabel = state === 'occurred' ? 'Completed' : 'Stopped';
    timestamp = { label: timestampLabel, value: finishedAt(step) };
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
    // A finished email step establishes a successful send even without a recipient event.
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
    email: content.email,
    statusLabel,
  };
};

const mapEnd = (
  history: AutomationRunHistory,
  automationSlug: string | null | undefined,
): HistoryCardData[] => {
  const base = { id: `end:${history.id}` };
  switch (history.status) {
    case 'completed':
      return [
        { ...base, kind: 'end', title: 'Completed', state: 'occurred', statusLabel: 'Completed' },
      ];
    case 'exited_early': {
      const lastStep = history.steps.at(-1);
      if (!lastStep || stepStates[lastStep.status].state !== 'exited') {
        throw new Error('An exited run must end with a stopped step');
      }
      let title: string = stepStates[lastStep.status].label;
      if (lastStep.status === 'member changed status') {
        if (automationSlug === WELCOME_EMAIL_SLUGS.free) {
          title = 'Upgraded to paid';
        } else if (automationSlug === WELCOME_EMAIL_SLUGS.paid) {
          title = 'Downgraded to free';
        }
      }
      if (lastStep.status === 'failed') {
        const names = { send_email: 'Email', wait: 'Wait' } satisfies Record<
          Step['action']['type'],
          string
        >;
        title = `${names[lastStep.action.type]} step failed`;
      }
      return [
        {
          ...base,
          kind: 'event',
          title,
          state: lastStep.status === 'failed' ? 'failed' : 'exited',
          statusLabel: 'Exited early',
          timestamp: { label: 'Step stopped', value: finishedAt(lastStep) },
        },
      ];
    }
    case 'in_progress':
      return [];
    default:
      throw new Error(`Unknown run status: ${String(history.status satisfies never)}`);
  }
};

export const mapRunHistory = (
  history: AutomationRunHistory,
  automationSlug?: string | null,
): HistoryCardData[] => [
  {
    id: `entry:${history.id}`,
    kind: 'trigger',
    title: 'Signed up',
    state: 'occurred',
    statusLabel: 'Entered',
    timestamp: { label: 'Entered', value: history.created_at },
  },
  // API order describes recorded history, not edges in the current editing graph.
  ...history.steps.map((step, index) =>
    mapStep(step, history.status === 'exited_early' && index === history.steps.length - 1),
  ),
  ...mapEnd(history, automationSlug),
];
