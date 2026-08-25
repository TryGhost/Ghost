import assert from 'node:assert/strict';
import sinon from 'sinon';
import { BookshelfPostsRepository } from '../../../../../../core/server/services/content-import/import/post-repository';
import type { PostData } from '../../../../../../core/server/services/content-import/import/post-data';

const data: PostData = {
  title: 'Imported post',
  slug: 'imported-post',
  status: 'published',
  type: 'post',
  visibility: 'public',
  tags: [],
};

function harness() {
  const transacting = { transaction: true };
  const existing = {
    id: 'existing',
    toJSON: sinon.stub().returns({ id: 'existing', updated_at: new Date('2025-01-01T00:00:00Z') }),
  };
  const created = { id: 'created', toJSON: () => ({ id: 'created' }) };
  const updated = { id: 'existing', toJSON: () => ({ id: 'existing' }) };
  const findOne = sinon.stub().resolves(null);
  const add = sinon.stub().resolves(created);
  const edit = sinon.stub().resolves(updated);
  const transaction = sinon.stub().callsFake(async (callback) => callback(transacting));
  const repository = new BookshelfPostsRepository({
    Base: { transaction },
    Post: { findOne, add, edit },
  });

  return { repository, transaction, transacting, findOne, add, edit, existing, created, updated };
}

describe('BookshelfPostsRepository', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('locks the matching slug and creates the post in one transaction', async function () {
    const h = harness();
    const options = { importing: true, context: { internal: true } };

    const result = await h.repository.write(data, options);

    assert.deepEqual(result, { status: 'created', post: h.created });
    sinon.assert.calledOnce(h.transaction);
    sinon.assert.calledWithExactly(
      h.findOne,
      { slug: 'imported-post', status: 'all' },
      { ...options, transacting: h.transacting, forUpdate: true },
    );
    sinon.assert.calledWithExactly(h.add, data, { ...options, transacting: h.transacting });
    assert.equal('transacting' in options, false, 'caller options are not mutated');
  });

  it('skips an existing slug without creating another post', async function () {
    const h = harness();
    h.findOne.resolves(h.existing);

    const result = await h.repository.write(data, {
      importing: true,
      context: { internal: true },
    });

    assert.deepEqual(result, {
      status: 'skipped',
      reason: 'A post with the slug "imported-post" already exists.',
    });
    sinon.assert.notCalled(h.add);
    sinon.assert.notCalled(h.edit);
  });

  it('matches an explicit source ID before considering the slug', async function () {
    const h = harness();
    h.findOne.resolves(h.existing);

    const result = await h.repository.write(
      { ...data, comment_id: 'source-123', slug: 'a-different-slug' },
      { importing: true, context: { internal: true } },
    );

    assert.deepEqual(result, {
      status: 'skipped',
      reason: 'A post with the source ID "source-123" already exists.',
    });
    sinon.assert.calledOnce(h.findOne);
    sinon.assert.calledWithMatch(h.findOne, {
      comment_id: 'source-123',
      status: 'all',
    });
    sinon.assert.notCalled(h.add);
    sinon.assert.notCalled(h.edit);
  });

  it('falls back to the slug when an explicit source ID does not match', async function () {
    const h = harness();
    h.findOne.onFirstCall().resolves(null);
    h.findOne.onSecondCall().resolves(h.existing);

    const result = await h.repository.write(
      { ...data, comment_id: 'new-source' },
      { importing: true, context: { internal: true } },
    );

    assert.deepEqual(result, {
      status: 'skipped',
      reason: 'A post with the slug "imported-post" already exists.',
    });
    assert.deepEqual(h.findOne.firstCall.args[0], {
      comment_id: 'new-source',
      status: 'all',
    });
    assert.deepEqual(h.findOne.secondCall.args[0], {
      slug: 'imported-post',
      status: 'all',
    });
    sinon.assert.notCalled(h.add);
    sinon.assert.notCalled(h.edit);
  });

  it('creates with an explicit source ID when neither source ID nor slug matches', async function () {
    const h = harness();
    const sourceData = { ...data, comment_id: 'new-source' };

    const result = await h.repository.write(sourceData, {
      importing: true,
      context: { internal: true },
    });

    assert.deepEqual(result, { status: 'created', post: h.created });
    sinon.assert.calledTwice(h.findOne);
    sinon.assert.calledWithExactly(
      h.add,
      sourceData,
      sinon.match({ importing: true, transacting: h.transacting }),
    );
    sinon.assert.notCalled(h.edit);
  });

  it('updates a matching post when the explicit incoming timestamp is newer', async function () {
    const h = harness();
    const options = { importing: true, context: { internal: true } };
    const updatedData = { ...data, updated_at: '2025-02-01T00:00:00.000Z' };
    h.findOne.resolves(h.existing);

    const result = await h.repository.write(updatedData, options, {
      sourceUpdatedAt: '2025-02-01T00:00:00.000Z',
    });

    assert.deepEqual(result, { status: 'updated', post: h.updated });
    sinon.assert.calledTwice(h.edit);
    sinon.assert.calledWithExactly(
      h.edit.firstCall,
      { ...updatedData, updated_at: new Date('2025-01-01T00:00:00Z') },
      {
        ...options,
        transacting: h.transacting,
        id: 'existing',
      },
    );
    sinon.assert.calledWithExactly(
      h.edit.secondCall,
      { updated_at: '2025-02-01T00:00:00.000Z' },
      {
        ...options,
        transacting: h.transacting,
        id: 'existing',
      },
    );
    sinon.assert.notCalled(h.add);
  });

  it('compares equal timestamps as instants and skips the update', async function () {
    const h = harness();
    h.findOne.resolves(h.existing);

    const result = await h.repository.write(
      data,
      {},
      {
        sourceUpdatedAt: '2025-01-01T01:00:00+01:00',
      },
    );

    assert.deepEqual(result, {
      status: 'skipped',
      reason: 'The existing post is newer than or as recent as the imported row.',
    });
    sinon.assert.notCalled(h.edit);
  });

  it('skips an older incoming timestamp', async function () {
    const h = harness();
    h.findOne.resolves(h.existing);

    const result = await h.repository.write(
      data,
      {},
      {
        sourceUpdatedAt: '2024-12-31T23:59:59.999Z',
      },
    );

    assert.deepEqual(result.status, 'skipped');
    sinon.assert.notCalled(h.edit);
  });

  it('treats a missing stored timestamp as older', async function () {
    const h = harness();
    h.existing.toJSON.returns({ id: 'existing', updated_at: null });
    h.findOne.resolves(h.existing);

    const result = await h.repository.write(
      { ...data, updated_at: '2025-01-01T00:00:00.000Z' },
      { importing: true },
      { sourceUpdatedAt: '2025-01-01T00:00:00.000Z' },
    );

    assert.deepEqual(result, { status: 'updated', post: h.updated });
    sinon.assert.calledTwice(h.edit);
    assert.equal('updated_at' in h.edit.firstCall.args[0], false);
  });

  it('does not update for an invalid incoming timestamp', async function () {
    const h = harness();
    h.findOne.resolves(h.existing);

    const result = await h.repository.write(data, {}, { sourceUpdatedAt: 'not-a-date' });

    assert.deepEqual(result.status, 'skipped');
    sinon.assert.notCalled(h.edit);
  });

  it('propagates lookup failures and never attempts the insert', async function () {
    const h = harness();
    const failure = new Error('lookup failed');
    h.findOne.rejects(failure);

    await assert.rejects(
      h.repository.write(data, { importing: true, context: { internal: true } }),
      failure,
    );

    sinon.assert.notCalled(h.add);
  });

  it('propagates source ID lookup failures without falling back to the slug', async function () {
    const h = harness();
    const failure = new Error('source lookup failed');
    h.findOne.rejects(failure);

    await assert.rejects(
      h.repository.write(
        { ...data, comment_id: 'source-123' },
        { importing: true, context: { internal: true } },
      ),
      failure,
    );

    sinon.assert.calledOnce(h.findOne);
    sinon.assert.notCalled(h.add);
  });

  it('propagates insert failures through the transaction', async function () {
    const h = harness();
    const failure = new Error('insert failed');
    h.add.rejects(failure);

    await assert.rejects(
      h.repository.write(data, { importing: true, context: { internal: true } }),
      failure,
    );
  });

  it('propagates update failures through the transaction', async function () {
    const h = harness();
    const failure = new Error('update failed');
    h.findOne.resolves(h.existing);
    h.edit.rejects(failure);

    await assert.rejects(
      h.repository.write(
        { ...data, updated_at: '2025-02-01T00:00:00.000Z' },
        { importing: true },
        { sourceUpdatedAt: '2025-02-01T00:00:00.000Z' },
      ),
      failure,
    );

    sinon.assert.notCalled(h.add);
  });

  it('rolls back when persisting the incoming update timestamp fails', async function () {
    const h = harness();
    const failure = new Error('timestamp update failed');
    h.findOne.resolves(h.existing);
    h.edit.onFirstCall().resolves(h.updated);
    h.edit.onSecondCall().rejects(failure);

    await assert.rejects(
      h.repository.write(
        { ...data, updated_at: '2025-02-01T00:00:00.000Z' },
        { importing: true },
        { sourceUpdatedAt: '2025-02-01T00:00:00.000Z' },
      ),
      failure,
    );

    sinon.assert.calledTwice(h.edit);
    sinon.assert.notCalled(h.add);
  });

  it('propagates a failure to open the transaction without querying posts', async function () {
    const h = harness();
    const failure = new Error('transaction failed');
    h.transaction.rejects(failure);

    await assert.rejects(
      h.repository.write(data, { importing: true, context: { internal: true } }),
      failure,
    );

    sinon.assert.notCalled(h.findOne);
    sinon.assert.notCalled(h.add);
  });
});
