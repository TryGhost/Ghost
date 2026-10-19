import { setTag } from '@sentry/react';
import { AUTOMATIONS_MASK_ATTRIBUTE } from './sentry-config';

export const AUTOMATIONS_REPLAY_SAMPLE_RATE = 1;

export interface ReplayControls {
  start(): void;
  stop(): Promise<void>;
  startBuffering(): void;
}

export interface AutomationsReplay {
  /** Reports the router's current pathname. */
  update(pathname: string): void;
  dispose(): void;
}

export function isAutomationsPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '');
  return path === '/automations' || path.startsWith('/automations/');
}

/**
 * Masks Automations content in replays while an Automations route shows and, when
 * `shouldStartRecording`, switches error buffering to a full recording on the first visit.
 */
export function createAutomationsReplay(
  replay: ReplayControls,
  shouldStartRecording: boolean,
  initialPathname: string,
): AutomationsReplay {
  let currentPathname = initialPathname;
  let initialCheckDone = false;
  let recordingStarted = false;

  const updateMask = () => {
    if (isAutomationsPath(currentPathname)) {
      document.body.setAttribute(AUTOMATIONS_MASK_ATTRIBUTE, 'true');
    } else {
      document.body.removeAttribute(AUTOMATIONS_MASK_ATTRIBUTE);
    }
  };

  const maybeStartRecording = () => {
    if (!shouldStartRecording || !isAutomationsPath(currentPathname) || recordingStarted) {
      return;
    }
    recordingStarted = true;

    replay
      .stop()
      .then(() => {
        replay.start();
        setTag('replay_area', 'automations');
      })
      .catch(() => {
        try {
          replay.startBuffering();
        } catch {
          // Replay is still running; nothing to restore
        }
      });
  };

  // Mask direct loads before Replay records its initial buffer
  updateMask();

  // Replay initialises deferred from Sentry.init(); starting earlier would add a second recorder
  const initialCheck = setTimeout(() => {
    initialCheckDone = true;
    maybeStartRecording();
  });

  return {
    update(pathname) {
      currentPathname = pathname;
      updateMask();
      if (initialCheckDone) {
        maybeStartRecording();
      }
    },
    dispose() {
      clearTimeout(initialCheck);
      document.body.removeAttribute(AUTOMATIONS_MASK_ATTRIBUTE);
    },
  };
}
