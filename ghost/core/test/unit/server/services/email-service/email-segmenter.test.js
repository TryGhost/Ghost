const assert = require('node:assert/strict');
const EmailSegmenter = require('../../../../../core/server/services/email-service/email-segmenter');
const sinon = require('sinon');

describe('Email segmenter', function () {
  describe('scopePreparationQuery', function () {
    it('joins the newsletter subscription and orders by its index', function () {
      const emailSegmenter = new EmailSegmenter({});
      const calls = [];
      const query = {
        innerJoin(...args) {
          calls.push(['innerJoin', ...args]);
          return this;
        },
        where(...args) {
          calls.push(['where', ...args]);
          return this;
        },
      };
      const scoped = emailSegmenter.scopePreparationQuery(query, { id: 'newsletter-123' });
      assert.equal(scoped.query, query);
      assert.deepEqual(calls, [
        ['innerJoin', 'members_newsletters', 'members_newsletters.member_id', 'members.id'],
        ['where', 'members_newsletters.newsletter_id', 'newsletter-123'],
      ]);
      assert.equal(scoped.orderColumn, 'members_newsletters.member_id');
      assert.deepEqual(scoped.joinOrder, ['members_newsletters', 'members']);
    });

    it('omits the newsletter relation from the filter when preparation scopes it', function () {
      const emailSegmenter = new EmailSegmenter({});
      const newsletter = { id: 'newsletter-123', get: () => 'members' };
      assert.equal(
        emailSegmenter.getMemberFilterForSegment(newsletter, 'all', 'status:free', {
          withNewsletter: false,
        }),
        'email_disabled:0+(status:free)',
      );
    });
  });

  describe('getMemberCount', function () {
    let membersRepository;
    let listStub;

    beforeEach(function () {
      listStub = sinon.stub().resolves({
        meta: {
          pagination: { total: 12 },
        },
      });
      membersRepository = {
        list: listStub,
      };
    });

    afterEach(function () {
      sinon.restore();
    });

    it('creates correct filter and count for members visibility with null segment', async function () {
      const emailSegmenter = new EmailSegmenter({
        membersRepository,
      });

      const response = await emailSegmenter.getMembersCount(
        {
          id: 'newsletter-123',
          get: (key) => {
            if (key === 'visibility') {
              return 'members';
            }
          },
        },
        'all',
        null,
      );
      sinon.assert.calledOnce(listStub);
      sinon.assert.calledWith(listStub, {
        filter: "newsletters.id:'newsletter-123'+email_disabled:0",
      });
      assert.equal(response, 12);
    });

    it('throws errors for incorrect recipient filter or visibility', async function () {
      const emailSegmenter = new EmailSegmenter({
        membersRepository,
      });
      try {
        await emailSegmenter.getMembersCount(
          {
            id: 'newsletter-123',
            get: (key) => {
              if (key === 'visibility') {
                return 'members';
              }
            },
          },
          'none',
          null,
        );
      } catch (e) {
        assert.equal(e.message, 'Cannot send email to "none" recipient filter');
      }

      try {
        await emailSegmenter.getMembersCount(
          {
            id: 'newsletter-123',
            get: (key) => {
              if (key === 'visibility') {
                return '';
              }
            },
          },
          'members',
          null,
        );
      } catch (e) {
        assert.equal(
          e.message,
          'Unexpected visibility value "". Use one of the valid: "members", "paid".',
        );
      }
    });

    it('creates correct filter and count for paid visibility and custom recipient filter', async function () {
      const emailSegmenter = new EmailSegmenter({
        membersRepository,
      });
      const response = await emailSegmenter.getMembersCount(
        {
          id: 'newsletter-123',
          get: (key) => {
            if (key === 'visibility') {
              return 'paid';
            }
          },
        },
        'labels:test',
        null,
      );

      sinon.assert.calledOnce(listStub);
      sinon.assert.calledWith(listStub, {
        filter: "newsletters.id:'newsletter-123'+email_disabled:0+(labels:test)+status:-free",
      });
      assert.equal(response, 12);
    });

    it('creates correct filter and count for paid visibility and custom segment', async function () {
      const emailSegmenter = new EmailSegmenter({
        membersRepository,
      });
      const response = await emailSegmenter.getMembersCount(
        {
          id: 'newsletter-123',
          get: (key) => {
            if (key === 'visibility') {
              return 'members';
            }
          },
        },
        'labels:test',
        'status:free',
      );

      sinon.assert.calledOnce(listStub);
      sinon.assert.calledWith(listStub, {
        filter: "newsletters.id:'newsletter-123'+email_disabled:0+(labels:test)+(status:free)",
      });
      assert.equal(response, 12);
    });
  });
});
