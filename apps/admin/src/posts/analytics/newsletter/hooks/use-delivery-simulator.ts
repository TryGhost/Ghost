import { useMemo, useSyncExternalStore } from 'react';

// Prototype: simulated email delivery model for the post analytics newsletter
// tab. All numbers derive from a single model so the status sentence ("sent"
// language) and the KPI cards ("delivered"/"failed" language) always
// reconcile: delivered + failed = sent.

export type DeliverySimState =
  | 'off'
  | 'publishing'
  | 'sending'
  | 'delivering'
  | 'sent'
  | 'lagging'
  | 'failed-partial'
  | 'failed-all';

export interface DeliverySimModel {
  audience: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
}

// Site-wide average delivery rate for the comparison ring. Real
// implementation would derive this from newsletter stats; a healthy list
// sits around 98–99%.
export const AVERAGE_DELIVERED_RATE = 0.988;

export const SIM_STATES: { value: DeliverySimState; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'publishing', label: 'Just published' },
  { value: 'sending', label: 'Sending' },
  { value: 'delivering', label: 'Delivering' },
  { value: 'sent', label: 'Sent' },
  { value: 'lagging', label: 'Analytics lagging' },
  { value: 'failed-partial', label: 'Failed partway' },
  { value: 'failed-all', label: 'Failed at start' },
];

const roundToNice = (value: number, audience: number): number => {
  const step = audience >= 1000 ? 100 : audience >= 100 ? 10 : 1;
  return Math.max(step, Math.round(value / step) * step);
};

const buildModel = (
  audience: number,
  state: DeliverySimState,
  progress: number,
): DeliverySimModel => {
  const normalFailures = (count: number) => Math.max(1, Math.round(count * 0.004));

  if (state === 'publishing' || state === 'failed-all') {
    // Nothing has been sent: every count is genuinely zero.
    return { audience, sent: 0, delivered: 0, failed: 0, opened: 0, clicked: 0 };
  }

  if (state === 'sending') {
    // Mid-send: counts grow monotonically with sending progress. Delivery
    // lags handoff slightly; opens trail delivery. Rounded so poll-to-poll
    // movement reads calm, not jittery.
    const sent = roundToNice((audience * progress) / 100, audience);
    const delivered = roundToNice((audience * Math.max(0, progress - 8)) / 100, audience);
    const opened = Math.round(delivered * 0.15);
    return {
      audience,
      sent: Math.min(sent, audience),
      delivered: Math.min(delivered, sent),
      failed: 0,
      opened,
      clicked: Math.round(opened * 0.13),
    };
  }

  if (state === 'delivering') {
    // Handoff done, delivery tail still landing. Progress picks up where the
    // sending phase left delivery (~92%) and closes the gap.
    const failedFinal = normalFailures(audience);
    const delivered = Math.min(
      roundToNice((audience * progress) / 100, audience),
      audience - failedFinal,
    );
    const opened = Math.round(delivered * (0.15 + Math.max(0, progress - 92) * 0.03));
    return {
      audience,
      sent: audience,
      delivered,
      failed: 0,
      opened,
      clicked: Math.round(opened * 0.13),
    };
  }

  if (state === 'lagging') {
    // Settled send on a bad lag day: delivered (Mailgun aggregates) and
    // clicked (Ghost's own redirects) are current; opened is fed by the
    // event pipeline running ~8h behind, so it sits visibly low.
    const failed = normalFailures(audience);
    const delivered = audience - failed;
    return {
      audience,
      sent: audience,
      delivered,
      failed,
      opened: Math.round(delivered * 0.128),
      clicked: Math.round(delivered * 0.062),
    };
  }

  if (state === 'failed-partial') {
    const sent = Math.min(audience - 1, roundToNice(audience * 0.64, audience));
    const failed = Math.min(sent - 1, normalFailures(sent));
    const delivered = sent - failed;
    return {
      audience,
      sent,
      delivered,
      failed,
      opened: Math.round(delivered * 0.44),
      clicked: Math.round(delivered * 0.062),
    };
  }

  const failed = Math.min(Math.max(audience - 1, 0), normalFailures(audience));
  const delivered = audience - failed;
  return {
    audience,
    sent: audience,
    delivered,
    failed,
    opened: Math.round(delivered * 0.44),
    clicked: Math.round(delivered * 0.062),
  };
};

export const formatSentDate = (publishedAt?: string): string => {
  const date = publishedAt ? new Date(publishedAt) : new Date();
  const day = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time}`;
};

// Module-level store so the simulated state is shared across tabs (the user
// lands on Overview after sending, then clicks through to Newsletter) and
// survives tab switches within the analytics view.
const store = {
  state: 'off' as DeliverySimState,
  progress: 0,
  listeners: new Set<() => void>(),
  timer: undefined as ReturnType<typeof setInterval> | undefined,
  notify() {
    this.listeners.forEach((listener) => listener());
  },
  startTimer() {
    this.timer = setInterval(() => {
      // Monotonic climb. "sending" tracks Ghost → Mailgun handoff (the bar),
      // which genuinely completes; "delivering" then closes the delivery
      // tail before the send settles.
      const step = this.state === 'sending' ? 1 + Math.floor(Math.random() * 4) : 1;
      this.progress = Math.min(100, this.progress + step);
      this.notify();
      if (this.progress >= 100) {
        this.stopTimer();
        const current = this.state;
        const next: DeliverySimState = current === 'sending' ? 'delivering' : 'sent';
        setTimeout(() => {
          if (this.state === current) {
            this.setState(next);
          }
        }, 1200);
      }
    }, 900);
  },
  stopTimer() {
    clearInterval(this.timer);
    this.timer = undefined;
  },
  setState(state: DeliverySimState) {
    this.state = state;
    this.stopTimer();
    // "delivering" picks up where the sending phase left delivery (~92%).
    this.progress = state === 'sending' ? 3 : state === 'delivering' ? 92 : 0;
    if (state === 'sending' || state === 'delivering') {
      this.startTimer();
    }
    this.notify();
  },
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    if ((this.state === 'sending' || this.state === 'delivering') && this.timer === undefined) {
      this.startTimer();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopTimer();
      }
    };
  },
};

const subscribe = (listener: () => void) => store.subscribe(listener);
const getState = () => store.state;
const getProgress = () => store.progress;
const setSimState = (state: DeliverySimState) => store.setState(state);

export const useDeliverySimulator = (audience: number) => {
  const state = useSyncExternalStore(subscribe, getState);
  const progress = useSyncExternalStore(subscribe, getProgress);

  const model = useMemo(() => buildModel(audience, state, progress), [audience, state, progress]);
  const settled =
    state === 'sent' || state === 'lagging' || state === 'failed-partial' || state === 'failed-all';
  // Once handoff is complete the sent denominator is frozen, so every rate is
  // monotonic — numbers and rates simply show and keep climbing. No fuzzy
  // "delivering" status exists in the UI; it's only a sim phase that keeps
  // the counts moving after the bar completes.
  const numbersLive = settled || state === 'delivering';

  return { state, setState: setSimState, progress, model, settled, numbersLive };
};
