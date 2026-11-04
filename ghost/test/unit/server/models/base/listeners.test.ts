import assert from 'node:assert/strict';
import moment from 'moment-timezone';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../../core/server/models';
// @ts-expect-error This module lacks type definitions.
import listeners from '../../../../../core/server/models/base/listeners';

type PostAttributes = {
  id: string;
  status: 'scheduled' | 'draft';
  published_at: Date;
};

type TimezoneSetting = {
  attributes: { value: string };
  _previousAttributes: { value: string };
};

type TimezoneHandler = (
  setting: TimezoneSetting,
  options?: { importing?: boolean },
) => Promise<void> | void;

function createScheduledPost(id: string, publishedAt: string) {
  const attributes: PostAttributes = {
    id,
    status: 'scheduled',
    published_at: new Date(publishedAt),
  };

  return {
    id,
    attributes,
    get: (key: keyof PostAttributes) => attributes[key],
    set: <Key extends keyof PostAttributes>(key: Key, value: PostAttributes[Key]) => {
      attributes[key] = value;
    },
    toJSON: () => ({ ...attributes }),
  };
}

function timezoneEditedHandler(): TimezoneHandler {
  const handlers = new Map<string, TimezoneHandler>();
  listeners.registerListeners({
    on: (eventName: string, handler: TimezoneHandler) => {
      handlers.set(eventName, handler);
    },
  });
  const handler = handlers.get('settings.timezone.edited');
  assert.ok(handler);
  return handler;
}

function stubPostOperations(posts: ReturnType<typeof createScheduledPost>[]) {
  const transacting = { id: 'transaction' };
  const transactionStub = sinon
    .stub(models.Base, 'transaction')
    .callsFake(async (callback: (transaction: typeof transacting) => Promise<void>) =>
      callback(transacting),
    );
  const findScheduledPostsStub = sinon.stub(models.Post, 'findAll').resolves(posts);
  const editPostStub = sinon.stub(models.Post, 'edit').resolves();
  return { transacting, transactionStub, findScheduledPostsStub, editPostStub };
}

describe('base model listeners', function () {
  beforeEach(function () {
    sinon.useFakeTimers({
      now: new Date('2026-10-21T12:00:00.000Z'),
      toFake: ['Date'],
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  const fixtures = [
    {
      name: 'uses the target date winter offset',
      previousTimezone: 'Etc/UTC',
      newTimezone: 'America/New_York',
      publishedAt: '2027-01-15T10:00:00.000Z',
      expectedPublishedAt: '2027-01-15T15:00:00.000Z',
      expectedLocalTime: '2027-01-15 10:00',
    },
    {
      name: 'moves a New York spring gap time forward',
      previousTimezone: 'Etc/UTC',
      newTimezone: 'America/New_York',
      publishedAt: '2027-03-14T02:30:00.000Z',
      expectedPublishedAt: '2027-03-14T07:30:00.000Z',
      expectedLocalTime: '2027-03-14 03:30',
    },
    {
      name: 'moves the London to Los Angeles spring gap time to 03:00',
      previousTimezone: 'Europe/London',
      newTimezone: 'America/Los_Angeles',
      publishedAt: '2027-03-14T02:00:00.000Z',
      expectedPublishedAt: '2027-03-14T10:00:00.000Z',
      expectedLocalTime: '2027-03-14 03:00',
    },
    {
      name: 'uses the first New York fall overlap occurrence from UTC',
      previousTimezone: 'Etc/UTC',
      newTimezone: 'America/New_York',
      publishedAt: '2027-11-07T01:30:00.000Z',
      expectedPublishedAt: '2027-11-07T05:30:00.000Z',
      expectedLocalTime: '2027-11-07 01:30',
    },
    {
      name: 'uses the second New York fall overlap occurrence from Los Angeles',
      previousTimezone: 'America/Los_Angeles',
      newTimezone: 'America/New_York',
      publishedAt: '2027-11-07T08:30:00.000Z',
      expectedPublishedAt: '2027-11-07T06:30:00.000Z',
      expectedLocalTime: '2027-11-07 01:30',
    },
  ];

  for (const fixture of fixtures) {
    it(fixture.name, async function () {
      const post = createScheduledPost('post', fixture.publishedAt);
      const { transacting, transactionStub, findScheduledPostsStub, editPostStub } =
        stubPostOperations([post]);

      await timezoneEditedHandler()({
        attributes: { value: fixture.newTimezone },
        _previousAttributes: { value: fixture.previousTimezone },
      });

      assert.equal(post.attributes.status, 'scheduled');
      assert.equal(post.attributes.published_at.toISOString(), fixture.expectedPublishedAt);
      assert.equal(
        moment(post.attributes.published_at).tz(fixture.newTimezone).format('YYYY-MM-DD HH:mm'),
        fixture.expectedLocalTime,
      );
      sinon.assert.calledOnce(transactionStub);
      sinon.assert.calledOnceWithExactly(findScheduledPostsStub, {
        filter: 'status:scheduled',
        context: { internal: true },
        transacting,
        forUpdate: true,
      });
      sinon.assert.calledOnceWithExactly(editPostStub, post.toJSON(), {
        id: post.id,
        context: { internal: true },
        transacting,
        forUpdate: true,
      });
    });
  }

  it('drafts posts less than five minutes away but keeps the boundary scheduled', async function () {
    const tooSoon = createScheduledPost('too-soon', '2026-10-21T21:04:59.000Z');
    const boundary = createScheduledPost('boundary', '2026-10-21T21:05:00.000Z');
    const { editPostStub } = stubPostOperations([tooSoon, boundary]);

    await timezoneEditedHandler()({
      attributes: { value: 'Asia/Seoul' },
      _previousAttributes: { value: 'Etc/UTC' },
    });

    assert.equal(tooSoon.attributes.status, 'draft');
    assert.equal(tooSoon.attributes.published_at.toISOString(), '2026-10-21T21:04:59.000Z');
    assert.equal(boundary.attributes.status, 'scheduled');
    assert.equal(boundary.attributes.published_at.toISOString(), '2026-10-21T12:05:00.000Z');
    sinon.assert.calledTwice(editPostStub);
  });

  it('does nothing when the timezone has not changed', async function () {
    const { transactionStub } = stubPostOperations([]);

    await timezoneEditedHandler()({
      attributes: { value: 'Etc/UTC' },
      _previousAttributes: { value: 'Etc/UTC' },
    });

    sinon.assert.notCalled(transactionStub);
  });

  it('does nothing during an import', async function () {
    const { transactionStub } = stubPostOperations([]);

    await timezoneEditedHandler()(
      {
        attributes: { value: 'America/New_York' },
        _previousAttributes: { value: 'Etc/UTC' },
      },
      { importing: true },
    );

    sinon.assert.notCalled(transactionStub);
  });

  it('does not edit anything when there are no scheduled posts', async function () {
    const { transactionStub, findScheduledPostsStub, editPostStub } = stubPostOperations([]);

    await timezoneEditedHandler()({
      attributes: { value: 'America/New_York' },
      _previousAttributes: { value: 'Etc/UTC' },
    });

    sinon.assert.calledOnce(transactionStub);
    sinon.assert.calledOnce(findScheduledPostsStub);
    sinon.assert.notCalled(editPostStub);
  });

  it('uses the updated date when the timezone changes again', async function () {
    const post = createScheduledPost('post', '2027-01-15T10:00:00.000Z');
    const { editPostStub } = stubPostOperations([post]);
    const timezoneEdited = timezoneEditedHandler();

    await timezoneEdited({
      attributes: { value: 'America/New_York' },
      _previousAttributes: { value: 'Etc/UTC' },
    });
    assert.equal(post.attributes.published_at.toISOString(), '2027-01-15T15:00:00.000Z');

    await timezoneEdited({
      attributes: { value: 'Etc/UTC' },
      _previousAttributes: { value: 'America/New_York' },
    });
    assert.equal(post.attributes.published_at.toISOString(), '2027-01-15T10:00:00.000Z');
    sinon.assert.calledTwice(editPostStub);
  });
});
