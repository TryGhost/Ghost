import { expect, it } from 'vitest';
import { DEFAULT_CANVAS_ROUTING_SOURCE } from '@/builder/canvas/route-compatibility';
import { FixtureClient } from './fixture-client';

it.each(['source', 'casper'] as const)(
  'requires actual default routing before rendering the %s fixture',
  async (fixtureId) => {
    const client = new FixtureClient(
      fixtureId,
      DEFAULT_CANVAS_ROUTING_SOURCE.replace('/{slug}/', '/news/{slug}/'),
    );
    try {
      await expect(client.render()).rejects.toThrow('custom routing');
    } finally {
      client.dispose();
    }
  },
);

it('refuses an unavailable routing snapshot instead of inventing defaults', async () => {
  const client = new FixtureClient('source', null);
  try {
    await expect(client.render()).rejects.toThrow('could not verify');
  } finally {
    client.dispose();
  }
});
