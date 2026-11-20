import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import {
  doFixtures,
  doProductAndNewsletter as doTierAndNewsletter,
  setupUser,
  type SetupData,
} from '../../../../core/server/auth/setup';

// require(), not import: the stubs must patch the instances setup loads
const models: {
  Post: {
    findOne(query: { slug: string }): Promise<{ id: string } | null>;
    edit(data: { mobiledoc: string }, options: { id: string }): Promise<unknown>;
  };
  User: {
    findOne(query: unknown): Promise<unknown>;
    setup(data: unknown, options: unknown): Promise<unknown>;
  };
} = require('../../../../core/server/models');

describe('Auth Service: setup', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('setupUser', function () {
    it('acts as the Owner with the roles its lookup loaded, leaving the response alone', async function () {
      const ownerRole = { id: 'role-owner', get: () => 'Owner' };
      const findOwner = sinon.stub(models.User, 'findOne').resolves({
        id: 'user-1',
        get: () => 'before setup',
        relations: { roles: { models: [ownerRole] } },
      });
      const edited = {
        id: 'user-1',
        get: (key: string) =>
          ({ email: 'owner@example.com', name: 'Owner', status: 'active' })[key],
        relations: {},
      };
      sinon.stub(models.User, 'setup').resolves(edited);

      const data = await setupUser({
        name: 'Owner',
        email: 'owner@example.com',
        password: 'password',
        blogTitle: 'Test Blog',
        status: 'active',
      });

      assert.deepEqual(data.principal, {
        kind: 'user',
        method: 'setup',
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          name: 'Owner',
          status: 'active',
          roles: [{ id: 'role-owner', name: 'Owner' }],
        },
      });
      assert.equal(data.user, edited);
      assert.deepEqual(edited.relations, {});
      sinon.assert.calledOnce(findOwner);
    });
  });

  describe('doProductAndNewsletter', function () {
    it('updates default product and newsletter name as the Owner', async function () {
      // setupUser builds the principal once; this step only passes it on
      const principal = {
        kind: 'user',
        method: 'setup',
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          name: 'Owner',
          status: 'active',
          roles: [{ id: 'role-owner', name: 'Owner' }],
        },
      } as const;
      const tierEditStub = sinon.stub().resolves();
      const newsletterEditStub = sinon.stub().resolves();
      const tierBrowseStub = sinon.stub().resolves({
        tiers: [
          {
            id: 'product-1',
            slug: 'free',
          },
          {
            id: 'product-2',
            slug: 'default-product',
          },
        ],
      });
      const newsletterBrowseStub = sinon.stub().resolves({
        newsletters: [
          {
            id: 'newsletter-1',
            slug: 'fake-newsletter',
          },
          {
            id: 'newsletter-2',
            slug: 'default-newsletter',
          },
        ],
      });
      const tiersAPI = {
        browse: tierBrowseStub,
        edit: tierEditStub,
      };
      const newslettersApi = {
        browse: newsletterBrowseStub,
        edit: newsletterEditStub,
      };
      const api = {
        tiers: tiersAPI,
        newsletters: newslettersApi,
      };
      const data = {
        principal,
        userData: {
          blogTitle: 'Test Blog',
        },
      };
      await doTierAndNewsletter(data, api);

      const context = { user: 'user-1', principal };
      sinon.assert.calledOnceWithExactly(
        tierEditStub,
        { tiers: [{ name: 'Test Blog' }] },
        { context, id: 'product-2' },
      );
      sinon.assert.calledOnceWithExactly(
        newsletterEditStub,
        { newsletters: [{ name: 'Test Blog' }] },
        { context, id: 'newsletter-2' },
      );
    });
  });

  describe('doFixtures', function () {
    const data = {
      user: { id: 'user-1' },
      userData: { name: 'Jo Bloggs', blogTitle: 'Test Blog' },
    } as unknown as SetupData;

    /** Stubs the post model; the edit for `held` stays pending until `release` is called. */
    function stubPosts({ held, fail }: { held?: string; fail?: string } = {}) {
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      sinon.stub(models.Post, 'findOne').callsFake(async ({ slug }: { slug: string }) => ({
        id: `${slug}-id`,
      }));
      const editStub = sinon
        .stub(models.Post, 'edit')
        .callsFake(async (__: unknown, { id }: { id: string }) => {
          if (fail && id === `${fail}-id`) {
            throw new Error('database is gone');
          }
          if (held && id === `${held}-id`) {
            await gate;
          }
        });
      return { editStub, release, heldId: `${held}-id` };
    }

    /** Starts doFixtures and checks it is still waiting once the held edit is reached. */
    async function assertWaitsFor({ editStub, release, heldId }: ReturnType<typeof stubPosts>) {
      let settled = false;
      // Handled straight away, so an early rejection fails the test instead of going unhandled
      const outcome = doFixtures(data).then(
        (value) => {
          settled = true;
          return { value };
        },
        (error: unknown) => {
          settled = true;
          return { error };
        },
      );

      try {
        const reached = () => editStub.args.some(([, { id }]) => id === heldId);
        for (let turn = 0; turn < 10 && !reached() && !settled; turn++) {
          await setImmediate();
        }
        assert.equal(settled, false);
        assert.ok(reached());
      } finally {
        release();
      }

      const result = await outcome;
      if ('error' in result) {
        throw result.error;
      }
      assert.equal(result.value, data);
    }

    for (const slug of ['coming-soon', 'about']) {
      it(`waits for the ${slug} edit before resolving`, async function () {
        const stubs = stubPosts({ held: slug });

        await assertWaitsFor(stubs);

        assert.deepEqual(
          stubs.editStub.args.map(([, { id }]) => id),
          ['coming-soon-id', 'about-id'],
        );
        for (const [{ mobiledoc }] of stubs.editStub.args) {
          assert.match(mobiledoc, /Test Blog/);
          assert.match(mobiledoc, /Jo Bloggs/);
          assert.doesNotMatch(mobiledoc, /{{/);
        }
      });
    }

    it('inserts the site details literally and keeps the mobiledoc valid', async function () {
      const { editStub } = stubPosts();
      const blogTitle = 'A "quoted" \\ blog {{author.name}}';
      const name = 'Jo {{date}} $& Bloggs';

      await doFixtures({ ...data, userData: { ...data.userData, blogTitle, name } });

      const aboutEdit = editStub.args.find(([, { id }]) => id === 'about-id');
      assert.ok(aboutEdit);
      const [, , , text] = JSON.parse(aboutEdit[0].mobiledoc).sections[0][2][0];
      assert.ok(text.startsWith(`${blogTitle} is an independent publication launched in `));
      assert.ok(text.includes(` by ${name}. If you subscribe`));
      assert.doesNotMatch(text, /launched in {{date}}/);
    });

    it('logs a warning and still waits for the next post when one fails', async function () {
      const warnStub = sinon.stub(logging, 'warn');
      const stubs = stubPosts({ held: 'about', fail: 'coming-soon' });

      await assertWaitsFor(stubs);

      assert.deepEqual(
        stubs.editStub.args.map(([, { id }]) => id),
        ['coming-soon-id', 'about-id'],
      );
      sinon.assert.calledOnce(warnStub);
      const [warning] = warnStub.firstCall.args as [Error];
      assert.match(warning.message, /coming-soon/);
      assert.match(String(warning.stack), /database is gone/);
    });
  });
});
