import type { SlugMachine } from '@/editor/engine/slug-machine';
import type { SlugPort, SlugProposal } from '@/editor/engine/save-engine';
import { deferred } from '@/utils/deferred';

export interface SlugPortAdapter {
  port: SlugPort;
  /** Commits a title without waiting for it; the save's `settled()` picks the work up. */
  commitTitle: (title: string) => void;
  /** Manual submissions participate in the same settling barrier as title commits. */
  editSlug: SlugMachine['slugEdited'];
  /** Releases old waiters at a document reload or disposal. */
  reset: () => void;
}

/**
 * Adapter over the slug machine. The machine's `pending` flag reads false
 * between an active request and a queued one, so settling follows the
 * submission promises instead.
 */
export function createSlugPort(machine: SlugMachine): SlugPortAdapter {
  let latest: Promise<unknown> = Promise.resolve();
  let boundary = deferred<void>();

  function track<T>(submission: Promise<T>): Promise<T> {
    latest = submission.catch(() => undefined);
    return submission;
  }

  async function settled(): Promise<void> {
    let awaited;
    do {
      awaited = latest;
      await Promise.race([awaited, boundary.promise]);
    } while (awaited !== latest);
  }

  async function fromTitle(title: string): Promise<SlugProposal> {
    const proposal = await track(machine.titleCommitted(title));

    return proposal.source === 'generated'
      ? { slug: proposal.slug, source: 'generated' }
      : { slug: machine.getState().slug, source: 'unchanged' };
  }

  return {
    port: { settled, fromTitle },
    commitTitle: (title) => void track(machine.titleCommitted(title)),
    editSlug: (input) => track(machine.slugEdited(input)),
    reset: () => {
      latest = Promise.resolve();
      const previous = boundary;
      boundary = deferred<void>();
      previous.resolve();
    },
  };
}
