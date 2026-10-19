import sinon from 'sinon';
import logging from '@tryghost/logging';
import { createLabelAddedPoll } from '../../../../../core/server/services/automations/label-added-poll';
import { LABEL_ADDED_POLL_INTERVAL_MS } from '../../../../../core/server/services/automations/constants';

describe('label added poll', function () {
  let now: Date;
  let enqueueLabelAddedRuns: sinon.SinonStub<[], Promise<{ hasLabelTriggers: boolean }>>;
  let enqueueAnotherPollAt: sinon.SinonStub<[Readonly<Date>], unknown>;
  let labelAddedPoll: () => Promise<void>;

  const minutesLater = (minutes: number) => new Date(now.getTime() + minutes * 60 * 1000);

  beforeEach(function () {
    now = new Date('2026-05-01T12:00:00.000Z');
    enqueueLabelAddedRuns = sinon.stub<[], Promise<{ hasLabelTriggers: boolean }>>();
    enqueueLabelAddedRuns.resolves({ hasLabelTriggers: true });
    enqueueAnotherPollAt = sinon.stub<[Readonly<Date>], unknown>();
    labelAddedPoll = createLabelAddedPoll({
      automationsApi: { enqueueLabelAddedRuns },
      enqueueAnotherPollAt,
      getNow: () => now,
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('checks right away, then schedules another check', async function () {
    await labelAddedPoll();

    sinon.assert.calledOnce(enqueueLabelAddedRuns);
    sinon.assert.calledOnceWithExactly(
      enqueueAnotherPollAt,
      new Date(now.getTime() + LABEL_ADDED_POLL_INTERVAL_MS),
    );
  });

  it("doesn't schedule another check if there are no label triggers", async function () {
    enqueueLabelAddedRuns.resolves({ hasLabelTriggers: false });

    await labelAddedPoll();

    sinon.assert.calledOnce(enqueueLabelAddedRuns);
    sinon.assert.notCalled(enqueueAnotherPollAt);
  });

  it('only checks once per interval, no matter how often it is polled', async function () {
    const firstCheckAt = now;
    await labelAddedPoll();
    now = minutesLater(1);
    await labelAddedPoll();
    now = minutesLater(13);
    await labelAddedPoll();

    sinon.assert.calledOnce(enqueueLabelAddedRuns);
    sinon.assert.calledOnce(enqueueAnotherPollAt);

    now = new Date(firstCheckAt.getTime() + LABEL_ADDED_POLL_INTERVAL_MS);
    await labelAddedPoll();

    sinon.assert.calledTwice(enqueueLabelAddedRuns);
  });

  it('schedules a check if polled between checks when none was scheduled', async function () {
    enqueueLabelAddedRuns.resolves({ hasLabelTriggers: false });
    const firstCheckAt = now;
    await labelAddedPoll();
    sinon.assert.notCalled(enqueueAnotherPollAt);

    // For example, an automation was just activated.
    now = minutesLater(5);
    await labelAddedPoll();
    await labelAddedPoll();

    sinon.assert.calledOnce(enqueueLabelAddedRuns);
    sinon.assert.calledOnceWithExactly(
      enqueueAnotherPollAt,
      new Date(firstCheckAt.getTime() + LABEL_ADDED_POLL_INTERVAL_MS),
    );
  });

  it('logs errors and tries again later', async function () {
    const logError = sinon.stub(logging, 'error');
    enqueueLabelAddedRuns.rejects(new Error('database is down'));

    await labelAddedPoll();

    sinon.assert.calledOnce(logError);
    sinon.assert.calledOnceWithExactly(
      enqueueAnotherPollAt,
      new Date(now.getTime() + LABEL_ADDED_POLL_INTERVAL_MS),
    );
  });
});
