/** What one editor tab tells the others in the same browser about a takeover. */
export interface LeaseSignal {
  /** `taken`: the sender took the lease over. `heard`: the tab it was taken from has learned so. */
  type: 'taken' | 'heard';
  /** The document, as `type:id`. */
  lease: string;
  from: string;
  /** The tab a `heard` answers. */
  to?: string;
}

export interface LeaseChannel {
  post: (signal: LeaseSignal) => void;
  close: () => void;
}

const NAME = 'ghost-editor-lease';

function isSignal(value: unknown): value is LeaseSignal {
  const signal = value as Partial<LeaseSignal> | null;
  return (
    typeof signal === 'object' &&
    signal !== null &&
    (signal.type === 'taken' || signal.type === 'heard') &&
    typeof signal.lease === 'string' &&
    typeof signal.from === 'string'
  );
}

/**
 * Tabs of one browser on the same site hear each other at once, where the
 * server only tells a tab at its next poll. A tab hears every tab but itself.
 * Null where the browser has no BroadcastChannel: the tabs then wait on polls.
 */
export function openLeaseChannel(onSignal: (signal: LeaseSignal) => void): LeaseChannel | null {
  if (typeof BroadcastChannel === 'undefined') {
    return null;
  }
  const channel = new BroadcastChannel(NAME);
  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (isSignal(event.data)) {
      onSignal(event.data);
    }
  };
  return {
    post: (signal) => channel.postMessage(signal),
    close: () => channel.close(),
  };
}
