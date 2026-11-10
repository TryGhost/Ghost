import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import * as sinon from 'sinon';
import type { Actor } from '../../../../core/server/lib/actor';
import { createChangeEvents, type Edited } from '../../../../core/server/lib/change-events';
import { createLoggingFake } from '../../../utils/logging-utils';

type Renamed = Edited<'Renamed', { name: string }>;

const actor: Actor = { type: 'user', id: 'user-1' };
const renamed: Renamed = {
  type: 'Renamed',
  change: 'edited',
  previous: { name: 'Before' },
  next: { name: 'After' },
};

describe('change events', function () {
  it('waits for every reaction, in order', async function () {
    const events = createChangeEvents<Renamed>({ logging: createLoggingFake() });
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
    const logging = createLoggingFake();
    const events = createChangeEvents<Renamed>({ logging });
    const reacted: Renamed[] = [];
    events.react(async () => {
      throw new Error('The action could not be logged');
    });
    events.react(async (_actor, event) => {
      reacted.push(event);
    });

    await events.raise(actor, renamed);

    assert.deepEqual(reacted, [renamed]);
    sinon.assert.calledOnce(logging.error);
  });
});
