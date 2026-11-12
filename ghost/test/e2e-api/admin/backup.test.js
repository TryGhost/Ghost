const {
  agentProvider,
  fixtureManager,
  matchers,
  assertions,
} = require('../../utils/e2e-framework');
const { anyContentLength, anyContentVersion, anyEtag, anyErrorId, stringMatching } = matchers;
const { cacheInvalidateHeaderNotSet } = assertions;
const { exportedBodyLatest } = require('../../utils/fixtures/export/body-generator');
const fs = require('fs-extra');
const assert = require('node:assert/strict');

/**
 * Checks the backup file the endpoint reported writing, then removes it so
 * each test starts without one.
 */
async function assertBackupWritten(body) {
  const filename = body.db[0].filename;
  const fileJSON = JSON.parse(await fs.readFile(filename, 'utf8'));
  await fs.remove(filename);

  // @TODO: make a way do this with snapshots!
  assert.ok(fileJSON.meta, 'Written file has a property called meta');
  assert.ok(fileJSON.data, 'Written file has a property called data');
  assert.ok(Array.isArray(fileJSON.data.posts), 'Written file includes the posts table');
}

describe('Backup Integration', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'members');
  });

  describe('Backup API', function () {
    describe('Backup Integration', function () {
      beforeAll(async function () {
        await agent.useBackupAdminAPIKey();
      });

      it('Can create a DB backup', async function () {
        const { body } = await agent
          .post('db/backup?filename=test')
          .expectStatus(200)
          .matchHeaderSnapshot({
            'content-length': anyContentLength,
            'content-version': anyContentVersion,
            etag: anyEtag,
          })
          .matchBodySnapshot({
            db: [
              {
                filename: stringMatching(/ghost-test\/data\/test\.json$/),
              },
            ],
          });

        await assertBackupWritten(body);
      });

      it('Can do a DB export', async function () {
        await agent
          .get('db/')
          .expectStatus(200)
          .matchHeaderSnapshot({
            'content-version': anyContentVersion,
            'content-disposition': stringMatching(/^Attachment; filename="[A-Za-z0-9._-]+\.json"$/),
          })
          .expect(cacheInvalidateHeaderNotSet())
          .expect(({ body }) => {
            assert.equal(body.db.length, 1);
            assert.ok(body.db[0].data);
            const dataKeys = Object.keys(exportedBodyLatest().db[0].data).sort();

            // NOTE: using `Object.keys` here instead of `should.have.only.keys` assertion
            //       because when `have.only.keys` fails there's no useful diff
            assert.deepEqual(Object.keys(body.db[0].data).sort(), dataKeys);
          });
      });

      it('Can export members CSV', async function () {
        await agent
          .get('members/upload/?limit=all')
          .expectStatus(200)
          .expectEmptyBody()
          .matchHeaderSnapshot({
            'content-version': anyContentVersion,
            'content-disposition': stringMatching(
              /^Attachment; filename="(?:[a-z0-9-]+\.)?ghost\.members\.\d{4}-\d{2}-\d{2}\.csv"$/,
            ),
          })
          .expect(({ text }) => {
            assert.match(
              text,
              /id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id/,
            );
          });
      });

      it('Can export post analytics CSV', async function () {
        // The trailing slash is what exempts this endpoint from the max
        // limit cap, so `limit=all` is only honoured in this exact form.
        await agent
          .get('posts/export/?limit=all')
          .expectStatus(200)
          .expectEmptyBody()
          .matchHeaderSnapshot({
            'content-version': anyContentVersion,
            'content-disposition': stringMatching(
              /^Attachment; filename="(?:[a-z0-9-]+\.)?ghost\.analytics\.\d{4}-\d{2}-\d{2}\.csv"$/,
            ),
          })
          .expect(({ text }) => {
            assert.match(text, /^id,title,url/);
          });
      });
    });

    describe('Zapier Integration', function () {
      beforeAll(async function () {
        await agent.useZapierAdminAPIKey();
      });

      it('Cannot create a DB backup', async function () {
        await agent
          .post('db/backup?filename=test')
          .expectStatus(403)
          .matchHeaderSnapshot({
            'content-length': anyContentLength,
            'content-version': anyContentVersion,
            etag: anyEtag,
          })
          .matchBodySnapshot({
            errors: [
              {
                id: anyErrorId,
              },
            ],
          });
      });

      it('Cannot do a DB export', async function () {
        await agent
          .get('db/')
          .expectStatus(403)
          .matchHeaderSnapshot({
            'content-version': anyContentVersion,
            etag: anyEtag,
          })
          .matchBodySnapshot({
            errors: [
              {
                id: anyErrorId,
              },
            ],
          });
      });

      it('Can export members CSV', async function () {
        await agent
          .get('members/upload/?limit=all')
          .expectStatus(200)
          .expectEmptyBody()
          .matchHeaderSnapshot({
            'content-version': anyContentVersion,
            'content-disposition': stringMatching(
              /^Attachment; filename="(?:[a-z0-9-]+\.)?ghost\.members\.\d{4}-\d{2}-\d{2}\.csv"$/,
            ),
          })
          .expect(({ text }) => {
            assert.match(
              text,
              /id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id/,
            );
          });
      });
    });

    describe('Owner: User authentication', function () {
      beforeAll(async function () {
        await agent.loginAsOwner();
      });

      it('Can create a DB backup', async function () {
        const { body } = await agent
          .post('db/backup?filename=test')
          .expectStatus(200)
          .matchHeaderSnapshot({
            'content-length': anyContentLength,
            'content-version': anyContentVersion,
            etag: anyEtag,
          })
          .matchBodySnapshot({
            db: [
              {
                filename: stringMatching(/ghost-test\/data\/test\.json$/),
              },
            ],
          });

        await assertBackupWritten(body);
      });

      it('Can export members CSV', async function () {
        await agent
          .get('members/upload/?limit=all')
          .expectStatus(200)
          .expectEmptyBody()
          .matchHeaderSnapshot({
            'content-version': anyContentVersion,
            'content-disposition': stringMatching(
              /^Attachment; filename="(?:[a-z0-9-]+\.)?ghost\.members\.\d{4}-\d{2}-\d{2}\.csv"$/,
            ),
          })
          .expect(({ text }) => {
            assert.match(
              text,
              /id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id/,
            );
          });
      });
    });

    describe('Owner: Staff token', function () {
      beforeAll(async function () {
        await agent.useStaffTokenForAdmin();
      });

      it('Can create a DB backup', async function () {
        const { body } = await agent
          .post('db/backup?filename=test')
          .expectStatus(200)
          .matchHeaderSnapshot({
            'content-length': anyContentLength,
            'content-version': anyContentVersion,
            etag: anyEtag,
          })
          .matchBodySnapshot({
            db: [
              {
                filename: stringMatching(/ghost-test\/data\/test\.json$/),
              },
            ],
          });

        await assertBackupWritten(body);
      });

      it('Can export members CSV', async function () {
        await agent
          .get('members/upload/?limit=all')
          .expectStatus(200)
          .expectEmptyBody()
          .matchHeaderSnapshot({
            'content-version': anyContentVersion,
            'content-disposition': stringMatching(
              /^Attachment; filename="(?:[a-z0-9-]+\.)?ghost\.members\.\d{4}-\d{2}-\d{2}\.csv"$/,
            ),
          })
          .expect(({ text }) => {
            assert.match(
              text,
              /id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id/,
            );
          });
      });
    });

    describe('Editor: User authentication', function () {
      beforeAll(async function () {
        await agent.loginAsEditor();
      });

      it('Cannot create a DB backup', async function () {
        await agent
          .post('db/backup?filename=test')
          .expectStatus(403)
          .matchHeaderSnapshot({
            'content-version': anyContentVersion,
            etag: anyEtag,
          })
          .matchBodySnapshot({
            errors: [
              {
                id: anyErrorId,
              },
            ],
          });
      });

      it('Cannot do a DB export', async function () {
        await agent
          .get('db/')
          .expectStatus(403)
          .matchHeaderSnapshot({
            'content-version': anyContentVersion,
            etag: anyEtag,
          })
          .matchBodySnapshot({
            errors: [
              {
                id: anyErrorId,
              },
            ],
          });
      });

      it('Cannot export members CSV', async function () {
        await agent
          .get('members/upload/?limit=all')
          .expectStatus(403)
          .matchHeaderSnapshot({
            'content-version': anyContentVersion,
            etag: anyEtag,
          })
          .matchBodySnapshot({
            errors: [
              {
                id: anyErrorId,
              },
            ],
          });
      });
    });
  });
});
