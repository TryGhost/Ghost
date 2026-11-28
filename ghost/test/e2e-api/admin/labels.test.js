const assert = require('node:assert/strict');
const logging = require('@tryghost/logging');
const { labels } = require('@tryghost/api-contracts/admin');
const {
  agentProvider,
  fixtureManager,
  matchers,
  assertions,
} = require('../../utils/e2e-framework');
const { anyContentVersion, anyObjectId, anyISODateTime, anyErrorId, anyEtag, anyLocationFor } =
  matchers;
const sinon = require('sinon');

const { bodyMatchesSchema } = assertions;

const matchLabel = {
  id: anyObjectId,
  created_at: anyISODateTime,
  updated_at: anyISODateTime,
};

describe('Labels API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
    await agent.loginAsOwner();
  });

  afterEach(function () {
    sinon.restore();
  });

  it('Can browse with no labels', async function () {
    await agent
      .get('labels')
      .expectStatus(200)
      .expect(bodyMatchesSchema(labels.responses.browse))
      .matchBodySnapshot()
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
  });

  it('Can add', async function () {
    await agent
      .post('labels')
      .body({
        labels: [
          {
            name: 'test',
          },
        ],
      })
      .expectStatus(201)
      .expect(bodyMatchesSchema(labels.responses.add))
      .matchBodySnapshot({
        labels: [matchLabel],
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
        location: anyLocationFor('labels'),
      });
  });

  it('Errors when adding label with the same name', async function () {
    const loggingStub = sinon.stub(logging, 'warn');
    await agent
      .post('labels')
      .body({
        labels: [
          {
            name: 'test',
          },
        ],
      })
      .expectStatus(422)
      .matchBodySnapshot({
        errors: [
          {
            id: anyErrorId,
          },
        ],
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
    sinon.assert.calledOnce(loggingStub);
  });

  it('Can browse with member count', async function () {
    await agent
      .get('labels/?include=count.members')
      .expectStatus(200)
      .expect(bodyMatchesSchema(labels.responsesWithMemberCount.browse))
      .matchBodySnapshot({
        labels: [matchLabel],
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
  });

  it('Can read by slug and edit', async function () {
    const { body } = await agent
      .get('labels/slug/test/')
      .expectStatus(200)
      .expect(bodyMatchesSchema(labels.responses.read))
      .matchBodySnapshot({
        labels: [matchLabel],
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });

    const id = body.labels[0].id;

    await agent
      .put(`labels/${id}`)
      .body({ labels: [{ name: 'testing' }] })
      .expectStatus(200)
      .expect(bodyMatchesSchema(labels.responses.edit))
      .matchBodySnapshot({
        labels: [matchLabel],
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
  });

  it('Errors when editing label to a name that already exists', async function () {
    const loggingStub = sinon.stub(logging, 'warn');

    const { body: targetBody } = await agent
      .post('labels')
      .body({
        labels: [
          {
            name: 'rename-target',
          },
        ],
      })
      .expectStatus(201)
      .expect(bodyMatchesSchema(labels.responses.add));

    const { body } = await agent
      .post('labels')
      .body({
        labels: [
          {
            name: 'rename-me',
          },
        ],
      })
      .expectStatus(201)
      .expect(bodyMatchesSchema(labels.responses.add));

    const id = body.labels[0].id;

    await agent
      .put(`labels/${id}`)
      .body({ labels: [{ name: 'rename-target' }] })
      .expectStatus(422)
      .matchBodySnapshot({
        errors: [
          {
            id: anyErrorId,
          },
        ],
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
    sinon.assert.calledOnce(loggingStub);

    await agent.delete(`labels/${id}`).expectStatus(204);

    await agent.delete(`labels/${targetBody.labels[0].id}`).expectStatus(204);
  });

  it('Errors when adding label with a name over the schema limit', async function () {
    const loggingStub = sinon.stub(logging, 'warn');
    await agent
      .post('labels')
      .body({
        labels: [
          {
            name: 'a'.repeat(192),
          },
        ],
      })
      .expectStatus(422)
      .matchBodySnapshot({
        errors: [
          {
            id: anyErrorId,
          },
        ],
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
    sinon.assert.calledOnce(loggingStub);
  });

  it('Rejects a body without the labels root key', async function () {
    sinon.stub(logging, 'warn');
    const { body } = await agent.post('labels').body({ name: 'no root key' }).expectStatus(422);
    assert.equal(body.errors[0].type, 'ValidationError');
    assert.equal(body.errors[0].property, 'body.labels');
  });

  it('Rejects an edit whose body id differs from the URL id', async function () {
    sinon.stub(logging, 'warn');
    const { body: created } = await agent
      .post('labels')
      .body({ labels: [{ name: 'id-mismatch' }] })
      .expectStatus(201)
      .expect(bodyMatchesSchema(labels.responses.add));
    const id = created.labels[0].id;

    const { body } = await agent
      .put(`labels/${id}`)
      .body({ labels: [{ id: 'abcd1234abcd1234abcd1234', name: 'renamed' }] })
      .expectStatus(422);
    assert.equal(body.errors[0].context, 'Invalid id provided.');

    await agent.delete(`labels/${id}`).expectStatus(204);
  });

  it('Ignores unknown includes and rejects invalid pagination', async function () {
    sinon.stub(logging, 'warn');
    const { body } = await agent
      .get('labels?include=count.members,nope')
      .expectStatus(200)
      .expect(bodyMatchesSchema(labels.responsesWithMemberCount.browse));
    for (const label of body.labels) {
      assert.equal(typeof label.count.members, 'number');
    }

    await agent.get('labels?page=first').expectStatus(422);
  });

  it('Errors when editing non-existent label', async function () {
    await agent
      .put('labels/abcd1234abcd1234abcd1234')
      .body({ labels: [{ name: 'does not matter' }] })
      .expectStatus(404)
      .matchBodySnapshot({
        errors: [
          {
            id: anyErrorId,
          },
        ],
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
  });

  it('Can destroy', async function () {
    const { body } = await agent
      .get('labels/slug/test/')
      .expectStatus(200)
      .expect(bodyMatchesSchema(labels.responses.read))
      .matchBodySnapshot({
        labels: [matchLabel],
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });

    const id = body.labels[0].id;

    await agent.delete(`labels/${id}`).expectStatus(204).expectEmptyBody().matchHeaderSnapshot({
      'content-version': anyContentVersion,
      etag: anyEtag,
    });
  });

  it('Cannot destroy non-existent label', async function () {
    await agent
      .delete('labels/abcd1234abcd1234abcd1234')
      .expectStatus(404)
      .matchBodySnapshot({
        errors: [
          {
            id: anyErrorId,
          },
        ],
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
  });
});
