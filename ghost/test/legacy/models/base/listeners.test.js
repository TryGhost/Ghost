const assert = require('node:assert/strict');
const sinon = require('sinon');
const moment = require('moment-timezone');
const events = require('../../../../core/server/lib/common/events');
const models = require('../../../../core/server/models');
const listeners = require('../../../../core/server/models/base/listeners');
const testUtils = require('../../../utils');

describe('Models: listeners', function () {
  const eventsToRemember = {};

  const scope = {
    posts: [],
  };

  const assertPreservedLocalTime = (post, scheduledAt, oldTimezone, newTimezone) => {
    const format = 'YYYY-MM-DD HH:mm:ss';
    const expectedTime = scheduledAt.clone().tz(oldTimezone).format(format);
    const actualTime = moment(post.get('published_at')).tz(newTimezone).format(format);
    assert.equal(actualTime, expectedTime, `local time for post ${post.get('title')}`);
  };

  beforeAll(testUtils.teardownDb);

  beforeEach(testUtils.setup('owner:pre', 'settings'));

  beforeEach(function () {
    sinon.stub(events, 'on').callsFake(function (eventName, callback) {
      eventsToRemember[eventName] = callback;
    });

    listeners.registerListeners(events);
  });

  afterEach(function () {
    events.on.restore();
    sinon.restore();
    scope.posts = [];
    return testUtils.teardownDb();
  });

  describe('on timezone changed', function () {
    let posts;

    describe('db has scheduled posts', function () {
      beforeEach(async function () {
        sinon.useFakeTimers({
          now: new Date('2027-03-12T12:30:00.000Z'),
          toFake: ['Date'],
        });
        scope.publishedAtFutureMoment1 = moment.utc().add(2, 'days').startOf('hour');
        scope.publishedAtFutureMoment2 = moment.utc().add(2, 'hours').startOf('hour');
        scope.publishedAtFutureMoment3 = moment.utc().add(10, 'hours').startOf('hour');

        scope.posts.push(
          testUtils.DataGenerator.forKnex.createPost({
            published_at: scope.publishedAtFutureMoment1.toDate(),
            status: 'scheduled',
            title: '1',
            slug: '1',
          }),
        );

        scope.posts.push(
          testUtils.DataGenerator.forKnex.createPost({
            published_at: scope.publishedAtFutureMoment2.toDate(),
            status: 'scheduled',
            title: '2',
            slug: '2',
          }),
        );

        scope.posts.push(
          testUtils.DataGenerator.forKnex.createPost({
            published_at: scope.publishedAtFutureMoment3.toDate(),
            status: 'scheduled',
            title: '3',
            slug: '3',
          }),
        );

        // Fixture inserts need no concurrency and can deadlock on MySQL.
        posts = [];
        for (const post of scope.posts) {
          posts.push(await models.Post.add(post, testUtils.context.owner));
        }

        assert.equal(posts.length, 3);
      });

      const assertPostStates = async function (statuses) {
        const results = await models.Post.findAll({ context: { internal: true } });
        assert.equal(results.models.length, posts.length);

        for (const [index, status] of statuses.entries()) {
          const title = String(index + 1);
          const post = results.models.find((model) => model.get('title') === title);
          assert.ok(post, `post ${title} exists`);
          assert.equal(post.get('status'), status, `status for post ${title}`);
          if (status === 'scheduled') {
            assertPreservedLocalTime(
              post,
              scope[`publishedAtFutureMoment${title}`],
              scope.oldTimezone,
              scope.newTimezone,
            );
          }
        }
      };

      it('timezone changes from London to Los Angeles', async function () {
        /**
         * From London +1
         * To Los Angeles -7
         *
         * The scheduled wall time must remain unchanged in Los Angeles.
         *
         * Image it's 11AM London time. 10AM UTC.
         * Imagine the post is scheduled for 8PM London time.
         * The database UTC string is e.g. 2017-04-18 19:00:00.
         * You switch the timezone to Los Angeles.
         * It's 3AM in the morning in Los Angeles.
         * If we don't change the database UTC string, the post is scheduled at 11AM in the morning! (19-7)
         * The post should be still scheduled for 8PM Los Angeles time.
         * So the database UTC string must be 2017-04-19 03:00:00. (-7 hours === 8 o'clock in Los Angeles)
         */

        scope.newTimezone = 'America/Los_Angeles';
        scope.oldTimezone = 'Europe/London';

        await eventsToRemember['settings.timezone.edited']({
          attributes: { value: scope.newTimezone },
          _previousAttributes: { value: scope.oldTimezone },
        });

        await assertPostStates(['scheduled', 'scheduled', 'scheduled']);
      });

      it('timezone changes from Baghdad to UTC', async function () {
        /**
         * From Baghdad +3
         * To UTC +/-0
         *
         * The scheduled wall time must remain unchanged in UTC.
         *
         * Image it's 11AM Baghdad time.
         * Imagine the post is scheduled for 8PM Baghdad time.
         * The database UTC string is e.g. 2017-04-18 17:00:00.
         * You switch the timezone to UTC.
         * It's 9AM in the morning in UTC.
         * If we don't change the database UTC string, the post is scheduled at 5PM in the evening!
         * The post should be still scheduled for 8PM UTC time.
         * So the database UTC string must be 2017-04-19 20:00:00.
         */
        scope.oldTimezone = 'Asia/Baghdad';
        scope.newTimezone = 'Etc/UTC';

        await eventsToRemember['settings.timezone.edited']({
          attributes: { value: scope.newTimezone },
          _previousAttributes: { value: scope.oldTimezone },
        });

        await assertPostStates(['scheduled', 'scheduled', 'scheduled']);
      });

      it('timezone changes from Amsterdam to Seoul', async function () {
        /**
         * From Amsterdam +2
         * To Seoul +9
         *
         * The scheduled wall time must remain unchanged in Seoul.
         *
         * Image it's 11AM Amsterdam time. 9AM UTC.
         * Imagine the post is scheduled for 8PM Amsterdam time.
         * The database UTC string is e.g. 2017-04-18 18:00:00.
         * You switch the timezone to Seoul timezone.
         * It's 6PM in the evening in Seoul timezone.
         * If we don't change the database UTC string, the post is scheduled at 3AM in the evening on the next day!
         * The post should be still scheduled for 8PM UTC time.
         * So the database UTC string must be 2017-04-18 11:00:00.
         */
        scope.oldTimezone = 'Europe/Amsterdam';
        scope.newTimezone = 'Asia/Seoul';

        await eventsToRemember['settings.timezone.edited']({
          attributes: { value: scope.newTimezone },
          _previousAttributes: { value: scope.oldTimezone },
        });

        await assertPostStates(['scheduled', 'draft', 'scheduled']);
      });
    });

    describe('db has no scheduled posts', function () {
      it('no scheduled posts', async function () {
        await eventsToRemember['settings.timezone.edited']({
          attributes: { value: 'America/Los_Angeles' },
          _previousAttributes: { value: 'Europe/London' },
        });

        const results = await models.Post.findAll({ context: { internal: true } });
        assert.equal(results.length, 0);
      });
    });
  });

  describe('on notifications changed', function () {
    it('nothing to delete', async function () {
      const notifications = JSON.stringify([
        {
          addedAt: moment().subtract(1, 'week').format(),
          seen: true,
        },
        {
          addedAt: moment().subtract(2, 'month').format(),
          seen: true,
        },
        {
          addedAt: moment().subtract(1, 'day').format(),
          seen: false,
        },
      ]);

      await models.Settings.edit(
        { key: 'notifications', value: notifications },
        testUtils.context.internal,
      );

      eventsToRemember['settings.notifications.edited']({
        attributes: {
          value: notifications,
        },
      });

      const model = await models.Settings.findOne(
        { key: 'notifications' },
        testUtils.context.internal,
      );
      assert.equal(JSON.parse(model.get('value')).length, 3);
    });

    it('expect deletion', async function () {
      const notifications = JSON.stringify([
        {
          content: 'keep-1',
          addedAt: moment().subtract(1, 'week').toDate(),
          seen: true,
        },
        {
          content: 'delete-me',
          addedAt: moment().subtract(3, 'month').toDate(),
          seen: true,
        },
        {
          content: 'keep-2',
          addedAt: moment().subtract(1, 'day').toDate(),
          seen: false,
        },
      ]);

      await models.Settings.edit(
        { key: 'notifications', value: notifications },
        testUtils.context.internal,
      );

      // Wait for the fire-and-forget settings.notifications.edited listener to
      // delete the stale notification before re-reading the value.
      await new Promise(function (resolve) {
        setTimeout(resolve, 100);
      });

      const model = await models.Settings.findOne(
        { key: 'notifications' },
        testUtils.context.internal,
      );
      assert.equal(JSON.parse(model.get('value')).length, 2);
    });
  });
});
