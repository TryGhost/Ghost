import { describe, expect, it, vi } from 'vitest';
import type { PublishDispatch } from '@/editor/publish/publish-options';
import type { SaveCompletion } from '@/editor/engine/save-engine';
import { createPublishDispatcher } from './publish-dispatch';

const SAVED: SaveCompletion = {
  kind: 'saved',
  result: { id: 'post-1', status: 'published', updatedAt: '2026-01-01T00:00:00.000Z' },
  executedAs: 'publish',
};

function harness() {
  const ports = {
    publish: vi.fn(() => Promise.resolve(SAVED)),
    schedule: vi.fn(() => Promise.resolve(SAVED)),
    revert: vi.fn(() => Promise.resolve(SAVED)),
  };

  return { ports, dispatch: createPublishDispatcher(ports) };
}

const SCHEDULED_AT = '2026-01-02T09:00:00.000Z';

const COMMANDS: Array<{
  name: string;
  command: PublishDispatch;
  intent: 'publish' | 'schedule' | 'revert';
  options?: unknown;
}> = [
  {
    name: 'a plain publish',
    command: { kind: 'publish', options: {} },
    intent: 'publish',
    options: {},
  },
  {
    name: 'a publish that emails',
    command: {
      kind: 'publish',
      options: { newsletter: 'weekly', emailSegment: 'status:free' },
    },
    intent: 'publish',
    options: { newsletter: 'weekly', emailSegment: 'status:free' },
  },
  {
    name: 'an email-only publish',
    command: { kind: 'publish', options: { emailOnly: true, newsletter: 'weekly' } },
    intent: 'publish',
    options: { emailOnly: true, newsletter: 'weekly' },
  },
  {
    name: 'a schedule',
    command: { kind: 'schedule', options: { publishedAt: SCHEDULED_AT } },
    intent: 'schedule',
    options: { publishedAt: SCHEDULED_AT },
  },
  {
    name: 'a schedule that emails',
    command: {
      kind: 'schedule',
      options: { publishedAt: SCHEDULED_AT, newsletter: 'weekly', emailSegment: 'status:-free' },
    },
    intent: 'schedule',
    options: { publishedAt: SCHEDULED_AT, newsletter: 'weekly', emailSegment: 'status:-free' },
  },
  { name: 'a revert', command: { kind: 'revert' }, intent: 'revert' },
];

describe('createPublishDispatcher', () => {
  it.each(COMMANDS)('routes $name to its engine intent', async ({ command, intent, options }) => {
    const { ports, dispatch } = harness();

    await expect(dispatch(command)).resolves.toEqual(SAVED);

    for (const [name, port] of Object.entries(ports)) {
      expect(port).toHaveBeenCalledTimes(name === intent ? 1 : 0);
    }

    if (options === undefined) {
      expect(ports.revert).toHaveBeenCalledWith();
    } else {
      expect(ports[intent]).toHaveBeenCalledWith(options);
    }
  });

  it('returns the completion the engine settles with', async () => {
    const { ports, dispatch } = harness();
    const failed: SaveCompletion = {
      kind: 'failed',
      error: { kind: 'host-limit', message: 'Over your member limit' },
      executedAs: 'publish',
    };
    ports.publish.mockResolvedValueOnce(failed);

    await expect(dispatch({ kind: 'publish', options: {} })).resolves.toEqual(failed);
  });
});
