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
  const existing = { id: 'existing', toJSON: () => ({ id: 'existing' }) };
  const created = { id: 'created', toJSON: () => ({ id: 'created' }) };
  const findOne = sinon.stub().resolves(null);
  const add = sinon.stub().resolves(created);
  const transaction = sinon.stub().callsFake(async (callback) => callback(transacting));
  const repository = new BookshelfPostsRepository({
    Base: { transaction },
    Post: { findOne, add },
  });

  return { repository, transaction, transacting, findOne, add, existing, created };
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
