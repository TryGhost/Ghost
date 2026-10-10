import type { SlugMachine } from '@/editor/engine/slug-machine';
import type { SlugPort, SlugProposal } from '@/editor/engine/save-engine';
import { deferred } from '@/utils/deferred';

export interface SlugPortAdapter {
  port: SlugPort;
  /** Commits a title without waiting for it; the save's `settled()` picks the work up. */
  commitTitle: (title: string) => void;
  /** Manual submissions participate in the same settling barrier as title commits. */
  editSlug: SlugMachine['slugEdited'];
  /** A title the post took on without the writer typing it: the slug keeps its value. */
  titleReplaced: (title: string) => void;
  /** Releases old waiters at a document reload or disposal. */
  reset: () => void;
}

/** Adapter over the slug machine. Settling waits for the latest submission and for the machine to go idle. */
export function createSlugPort(machine: SlugMachine): SlugPortAdapter {
  let latest: Promise<unknown> = Promise.resolve();
  let boundary = deferred<void>();

  function track<T>(submission: Promise<T>): Promise<T> {
    latest = submission.catch(() => undefined);
    return submission;
  }

  // Reads the machine, not the notified view: a drained submission can notify an
  // idle view after the state it started has already been committed.
  function idle(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (!machine.getState().pending) {
          stop();
          resolve();
        }
      };
      const stop = machine.subscribe(check);
      check();
    });
  }

  async function settled(): Promise<void> {
    let awaited;
    do {
      awaited = latest;
      await Promise.race([awaited, boundary.promise]);
      await Promise.race([idle(), boundary.promise]);
    } while (awaited !== latest);
  }

  async function fromTitle(title: string): Promise<SlugProposal> {
    const proposal = await track(machine.titleCommitted(title));

    return proposal.source === 'generated'
      ? { slug: proposal.slug, source: 'generated' }
      : { slug: machine.getState().slug, source: 'unchanged' };
  }

  function reset(): void {
    latest = Promise.resolve();
    const previous = boundary;
    boundary = deferred<void>();
    previous.resolve();
  }

  return {
    port: { settled, fromTitle },
    commitTitle: (title) => void track(machine.titleCommitted(title)),
    editSlug: (input) => {
      const slug = machine.getState().slug;
      const invalidated = boundary.promise;
      return Promise.race([
        track(machine.slugEdited(input)),
        invalidated.then(() => ({ slug, source: 'unchanged' as const, reason: 'stale' as const })),
      ]);
    },
    // A document boundary like a reload: release the waiters first, then re-read
    // ownership from the slug it already holds, so a slug the new title does not
    // slugify to reads custom and stops following the title.
    titleReplaced: (title) => {
      reset();
      machine.loaded({ slug: machine.getState().slug, title });
    },
    reset,
  };
}
