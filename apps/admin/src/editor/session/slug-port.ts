import type { SlugMachine } from '@/editor/engine/slug-machine';
import type { SlugPort, SlugProposal } from '@/editor/engine/save-engine';

export interface SlugPortAdapter {
  port: SlugPort;
  /** Commits a title without waiting for it; the save's `settled()` picks the work up. */
  commitTitle: (title: string) => void;
}

/**
 * Adapter over the slug machine. The machine's `pending` flag reads false
 * between an active request and a queued one, so settling follows the
 * submission promises instead.
 */
export function createSlugPort(machine: SlugMachine): SlugPortAdapter {
  let latest: Promise<unknown> = Promise.resolve();

  function track<T>(submission: Promise<T>): Promise<T> {
    latest = submission.catch(() => undefined);
    return submission;
  }

  async function settled(): Promise<void> {
    let awaited;
    do {
      awaited = latest;
      await awaited;
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
  };
}
