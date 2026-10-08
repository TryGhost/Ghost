import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import * as sinon from 'sinon';
import logging from '@tryghost/logging';
import type { Actor } from '../../../../core/server/lib/actor';
import { createChangeEvents, type Edited } from '../../../../core/server/lib/change-events';

type Renamed = Edited<'Renamed', { name: string }>;

const actor: Actor = { type: 'user', id: 'user-1' };
const renamed: Renamed = {
  type: 'Renamed',
  change: 'edited',
  previous: { name: 'Before' },
  next: { name: 'After' },
};

describe('change events', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('waits for every reaction, in order', async function () {
    const events = createChangeEvents<Renamed>();
    const reacted: string[] = [];
    events.react(async () => {
      await setImmediate();
      reacted.push('first');
    });
    events.react(async () => {
      reacted.push('second');
    });

    await events.raise(actor, renamed);

    assert.deepEqual(reacted, ['first', 'second']);
  });

  it('logs a failing reaction without failing the command, and still runs the rest', async function () {
    const loggingError = sinon.stub(logging, 'error');
    const events = createChangeEvents<Renamed>();
    const reacted: Renamed[] = [];
    events.react(async () => {
      throw new Error('The action could not be logged');
    });
    events.react(async (_actor, event) => {
      reacted.push(event);
    });

    await events.raise(actor, renamed);

    assert.deepEqual(reacted, [renamed]);
    sinon.assert.calledOnce(loggingError);
  });
});
