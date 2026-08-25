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
