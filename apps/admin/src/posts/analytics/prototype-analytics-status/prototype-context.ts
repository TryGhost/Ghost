// PROTOTYPE ONLY — not production code. See ./README.md
//
// Context + stub builder. Split from the provider so the module exports no
// components (mirrors providers/post-analytics-context.ts).

import { createContext, useContext } from 'react';
import { STATUS_VARIANTS } from './types';
import type {
  AnalyticsStatus,
  CountingState,
  EmailDataTreatment,
  SendState,
  StatusVariant,
} from './types';

export const STORAGE_KEY = 'ghost-prototype-analytics-status';

export interface PrototypeState {
  variant: StatusVariant;
  send: SendState;
  counting: CountingState;
  emailData: EmailDataTreatment;
}

/**
 * A clean send, played as a position on a line rather than a list of frames.
 *
 * Stepping between the three counting states made the figures jump by tens of
 * thousands at once, which is the opposite of what a send looks like and hid
 * the thing worth watching: whether a number climbing under a caption reads as
 * progress or as instability. So playback drives two continuous fractions and
 * the states fall out of them, instead of the other way round.
 *
 * They run at different speeds on purpose. Batches are all away before halfway,
 * while results keep arriving to the end — the lag between them is the entire
 * subject of this prototype, and a playback where they finished together would
 * show a send nobody has ever had.
 *
 * DEMO pacing: a real Tangle-scale send takes minutes, and 25 seconds read as
 * a progress bar rather than a send. Sixty gives a recording time to dwell on
 * each phase — preparation ~7s, batches away by ~27s, counting to the end.
 */
export const PLAYBACK_MS = 60_000;

export interface PlaybackProgress {
  /** Nothing has been handed over yet, and nothing is being counted. */
  preparing: boolean;
  /** How far through building the list, 0-1. Reaches 1 as `preparing` ends. */
  prepared: number;
  /** How much of the list has gone out, 0-1. */
  sent: number;
  /** How much of what went out has a result, 0-1. */
  counted: number;
}

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

/**
 * Where on the playback line the last batch is away: preparation ends at 0.12
 * and sending runs 0.33 past it (the fractions below). The ETA the sending
 * line shows counts down to this point, not to the end of playback — counting
 * continues after it, but the promise being timed is "100% sent".
 */
export const SEND_COMPLETE_POSITION = 0.45;

/** Where preparation hands off to sending, from the fractions below. */
export const PREPARING_END_POSITION = 0.12;

/**
 * The ETA the sending line shows runs on the send's own fictional clock, not
 * the playback's: a demo compressed into a minute would otherwise promise
 * "about 30 seconds" for a send that takes minutes in reality. Each phase
 * counts down from its own budget — preparation from two minutes, sending
 * from four — scaled by how far through the phase the run is, so the figures
 * shrink live while staying at the magnitude a real send would show.
 */
export const PREPARING_ETA_SECONDS = 2 * 60;
export const SENDING_ETA_SECONDS = 4 * 60;

export const playbackProgress = (position: number): PlaybackProgress => ({
  // Three seconds of preparation: published, nothing out yet. Long enough to
  // read, short enough that it is not the thing the run is about — this is the
  // phase a publisher passes through, not the one they sit in.
  preparing: position < 0.12,
  // Runs the length of that same window, so preparation is a bar that fills and
  // then hands off to the send count rather than a phase with nothing in it.
  prepared: clamp(position / 0.12),
  sent: clamp((position - 0.12) / 0.33),
  // Squared so results trickle in early and pour in late — which is also when
  // the gate that opens on "100% sent" is looking: at that moment (~0.45)
  // only about a tenth of outcomes are in, so the charts open onto small
  // figures that visibly climb rather than a page already a third full.
  counted: clamp((position - 0.17) / 0.83) ** 2,
});

/** The enum states the switcher highlights, read back off the position. */
export const playbackStates = (
  progress: PlaybackProgress,
): { send: SendState; counting: CountingState } => ({
  send: progress.preparing ? 'preparing' : progress.sent >= 1 ? 'submitted' : 'sending',
  counting: progress.counted <= 0 ? 'notStarted' : progress.counted >= 1 ? 'current' : 'counting',
});

export interface PrototypeContextValue extends PrototypeState {
  status: AnalyticsStatus;
  /**
   * Time left in the current phase, in the send's fictional seconds (see
   * PREPARING_ETA_SECONDS), recomputed on every playback tick so it counts
   * down as the run advances. Null when nothing is playing (a state picked
   * from the switcher is a frozen snapshot with no clock to estimate from)
   * and once the last batch is away.
   */
  sendEtaSeconds: number | null;
  isPlaying: boolean;
  /** Halted partway through a run, holding a position play() will resume from. */
  isPaused: boolean;
  /** A run has a position on screen — live, paused, or settled at the end. */
  hasPlayback: boolean;
  play: () => void;
  pause: () => void;
  /** Ends the run and drops its position, handing back to the manual picks. */
  stop: () => void;
  setVariant: (variant: StatusVariant) => void;
  setSend: (send: SendState) => void;
  setCounting: (counting: CountingState) => void;
  setEmailData: (emailData: EmailDataTreatment) => void;
}

export const DEFAULT_STATE: PrototypeState = {
  variant: 'activityLog',
  send: 'submitted',
  counting: 'notStarted',
  emailData: 'off',
};

export const PrototypeContext = createContext<PrototypeContextValue | null>(null);

/** Returns null outside the provider so wire-in points can no-op safely. */
export const usePrototypeAnalyticsStatus = (): PrototypeContextValue | null =>
  useContext(PrototypeContext);

export const readStoredState = (): PrototypeState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<PrototypeState>;
    const merged = { ...DEFAULT_STATE, ...parsed };
    // A variant that has since been removed would otherwise persist as a state
    // where nothing renders and nothing explains why.
    const isKnown = STATUS_VARIANTS.some((option) => option.value === merged.variant);
    return isKnown ? merged : { ...merged, variant: DEFAULT_STATE.variant };
  } catch {
    return DEFAULT_STATE;
  }
};

const minutesAgo = (minutes: number): Date => new Date(Date.now() - minutes * 60_000);

/**
 * Stubbed numbers, sized beyond half a million so the copy is stress-tested
 * at the width it has to survive. The two dimensions are built independently,
 * which is the whole point: every combination is reachable, including a failed
 * send whose successful batches are still hours behind.
 */
export const buildStatus = (
  send: SendState,
  counting: CountingState,
  progress?: PlaybackProgress,
): AnalyticsStatus => {
  const recipientCount = 547_120;
  const reachedCount = progress
    ? Math.round(recipientCount * progress.sent)
    : {
        preparing: 0,
        sending: 196_800,
        submitted: recipientCount,
        partiallyFailed: 331_000,
        failed: 0,
      }[send];

  // The watermark walks in with the results, so the "Up to 11:57" badge moves
  // during playback instead of sitting on one clock for forty seconds.
  const countingPart = progress
    ? {
        countedThrough:
          progress.counted > 0 ? minutesAgo(Math.round(18 - 15 * progress.counted)) : null,
        lagMinutes: Math.round(18 - 15 * progress.counted),
      }
    : {
        notStarted: { countedThrough: null, lagMinutes: 9 },
        counting: { countedThrough: minutesAgo(18), lagMinutes: 18 },
        current: { countedThrough: minutesAgo(3), lagMinutes: 3 },
      }[counting];

  // Counts are a fraction of what the provider accepted, not of the intended
  // list, so a partial failure keeps them internally consistent: opens can
  // never exceed deliveries, and deliveries can never exceed what was sent.
  // `current` is exactly 1 so the fully-accounted-for state is reachable from
  // the switcher — that is when the progress card retires.
  const fetched = progress
    ? progress.counted
    : { notStarted: 0, counting: 0.47, current: 1 }[counting];
  // Counted-so-far figures. Delivered + bounced never reaches sent while
  // counting is still running: the gap is everything not yet reported on.
  const settled = Math.round(reachedCount * fetched);
  const bouncedCount = Math.round(settled * 0.007);
  const deliveredCount = settled - bouncedCount;

  // A fixed midpoint when the state is picked from the switcher, the same way
  // `sending` is pinned to 31,500 there: a state chosen from a list is a
  // snapshot of a send caught partway, so it wants a value partway. Playback
  // overrides it with the real position, and it climbs.
  const preparedFraction = progress ? progress.prepared : send === 'preparing' ? 0.43 : 0;

  const startedAt = minutesAgo(74);
  const finishedAt = progress
    ? progress.sent >= 1
      ? minutesAgo(0)
      : null
    : send === 'sending' || send === 'preparing'
      ? null
      : minutesAgo(68);
  const firstDeliveryAt = deliveredCount > 0 ? minutesAgo(63) : null;

  return {
    send: { state: send, recipientCount, reachedCount, preparedFraction, startedAt, finishedAt },
    counting: { state: counting, ...countingPart, deliveredCount, bouncedCount, firstDeliveryAt },
  };
};
