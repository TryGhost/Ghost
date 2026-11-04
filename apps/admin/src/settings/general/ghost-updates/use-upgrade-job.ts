import { APIError } from '@tryghost/admin-x-framework/errors';
import { useReadUpgradeJob } from '@tryghost/admin-x-framework/api/upgrades';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { UpgradeJobResult } from '@tryghost/admin-x-framework/api/upgrades';
import { isActiveState } from './job-view';

const TEST_MODE = import.meta.env.MODE === 'test';
export const DEFAULT_POLL_MS = TEST_MODE ? 50 : 2000;
// Long enough for a backup, image pull and restart; after that, report the job stalled.
export const RECONNECT_LIMIT_MS = TEST_MODE ? 500 : 10 * 60 * 1000;

const STORAGE_KEY = 'ghost-admin:upgrade-job';

// Lets a running or failed job survive a reload; a successful one is cleared once seen.
function readStoredJobId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredJobId(id: string | null) {
  try {
    if (id) {
      window.localStorage.setItem(STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage is a convenience; the host's active_job_id still finds a running job.
  }
}

/**
 * Seconds from a 429's Retry-After header, if the error carries one.
 * Only Ghost's upgrade limiter sends it, always as whole seconds, never an HTTP-date.
 */
export function retryAfterMs(error: unknown): number | null {
  if (!(error instanceof APIError) || error.response?.status !== 429) {
    return null;
  }
  const seconds = Number(error.response.headers.get('retry-after'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60_000;
}

interface UpgradeJobTracking {
  jobId: string | null;
  job: UpgradeJobResult | undefined;
  stalled: boolean;
  /** The last request failed, but the job is still within its reconnect window. */
  reconnecting: boolean;
  /** Start following a job this tab requested, shown from the request's answer until polled. */
  track: (job: UpgradeJobResult) => void;
  dismiss: () => void;
}

/**
 * Follows one job across the restart an update causes: failed requests keep polling
 * until RECONNECT_LIMIT_MS has passed without a successful response.
 */
export function useUpgradeJob({
  activeJobId,
  pollAfterMs,
}: {
  activeJobId?: string | null;
  pollAfterMs?: number;
}): UpgradeJobTracking {
  const [jobId, setJobId] = useState<string | null>(() => readStoredJobId());
  const [contactAt, setContactAt] = useState(() => Date.now());
  const [accepted, setAccepted] = useState<UpgradeJobResult | null>(null);
  // Cached status keeps naming a job after it is dismissed; don't adopt it again.
  const dismissed = useRef(new Set<string>());

  useEffect(() => {
    if (activeJobId && activeJobId !== jobId && !dismissed.current.has(activeJobId)) {
      setJobId(activeJobId);
      setContactAt(Date.now());
      writeStoredJobId(activeJobId);
    }
  }, [activeJobId, jobId]);

  const query = useReadUpgradeJob(jobId ?? '', {
    enabled: Boolean(jobId),
    staleTime: 0,
    retry: false,
    defaultErrorHandler: false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchInterval: (current) => {
      const state = current.state.data?.upgrades[0]?.state;
      if (state && !isActiveState(state) && current.state.status === 'success') {
        return false;
      }
      // A 429 is Ghost answering, so it never counts towards the reconnect limit.
      const retryAfter = retryAfterMs(current.state.error);
      const lastContact = Math.max(contactAt, current.state.dataUpdatedAt);
      // Same clock as `stalled` below: stopping on Date.now() could stop short of a stall.
      if (
        current.state.status === 'error' &&
        retryAfter === null &&
        current.state.errorUpdatedAt - lastContact > RECONNECT_LIMIT_MS
      ) {
        return false;
      }
      return retryAfter ?? pollAfterMs ?? DEFAULT_POLL_MS;
    },
  });

  const job = query.data?.upgrades[0] ?? (accepted?.id === jobId ? accepted : undefined);
  // Whether this tab watched the job run, or requested it, rather than finding it finished.
  const sawActive = useRef(false);
  const jobActive = Boolean(job && isActiveState(job.state));
  useEffect(() => {
    if (jobActive) {
      sawActive.current = true;
    }
  }, [jobActive]);

  // A success needs no record once seen: the reload it asks for is the acknowledgement,
  // and a tab that opens after it finished is already on the new version.
  const doneId = job?.state === 'done' ? job.id : null;
  useEffect(() => {
    if (!doneId) {
      return;
    }
    writeStoredJobId(null);
    if (!sawActive.current) {
      // Status may still name it as active; don't adopt it again.
      dismissed.current.add(doneId);
      setJobId(null);
    }
  }, [doneId]);

  const lastContact = Math.max(contactAt, query.dataUpdatedAt);
  const stalled =
    query.isError &&
    retryAfterMs(query.error) === null &&
    query.errorUpdatedAt - lastContact > RECONNECT_LIMIT_MS;

  const track = useCallback((acceptedJob: UpgradeJobResult) => {
    sawActive.current = true;
    dismissed.current.delete(acceptedJob.id);
    setAccepted(acceptedJob);
    setJobId(acceptedJob.id);
    setContactAt(Date.now());
    writeStoredJobId(acceptedJob.id);
  }, []);

  const dismiss = useCallback(() => {
    if (jobId) {
      dismissed.current.add(jobId);
    }
    setJobId(null);
    setAccepted(null);
    writeStoredJobId(null);
  }, [jobId]);

  return {
    jobId,
    job: jobId ? job : undefined,
    stalled,
    reconnecting: query.isError && !stalled,
    track,
    dismiss,
  };
}
