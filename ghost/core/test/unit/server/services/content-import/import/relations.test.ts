import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
  BookshelfPostRelationsResolver,
  parseAuthorReferences,
  parseTagReferences,
} from '../../../../../../core/server/services/content-import/import/relations';
import type { PostData } from '../../../../../../core/server/services/content-import/import/post-data';

const data: PostData = {
  title: 'Imported post',
  slug: 'imported-post',
  status: 'published',
  type: 'post',
  visibility: 'public',
  tags: [{ name: '#Import batch' }],
};

const relation = (id: string) => ({ id });

describe('CSV post relation parsing', function () {
  it('pairs author names and emails positionally to the longest list', function () {
    assert.deepEqual(
      parseAuthorReferences(
        ' Alice Example, , Charlie Example ',
        'alice@example.com,bob@example.com,,fourth@example.com',
      ),
      [
        { name: 'Alice Example', email: 'alice@example.com' },
        { email: 'bob@example.com' },
        { name: 'Charlie Example' },
        { email: 'fourth@example.com' },
      ],
    );
    assert.deepEqual(parseAuthorReferences(',', ','), [{}, {}]);
  });

  it('preserves tag order while trimming and dropping empty positions', function () {
    assert.deepEqual(parseTagReferences(' First, ,Second,First '), ['First', 'Second', 'First']);
    assert.deepEqual(parseTagReferences(), []);
  });
});

describe('BookshelfPostRelationsResolver', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('matches authors by email or a name-only slug, preserving order and uniqueness', async function () {
    const findUser = sinon.stub().callsFake(async (lookup: { email?: string; slug?: string }) => {
      if (lookup.email === 'alice@example.com') {
        return relation('author-alice');
      }
      if (lookup.slug === 'charlie-example') {
        return relation('author-charlie');
      }
      return null;
    });
    const findTag = sinon.stub().resolves(null);
    const resolver = new BookshelfPostRelationsResolver({
      User: { findOne: findUser },
      Tag: { findOne: findTag },
    });
    const transacting = { transaction: true };

    const resolved = await resolver.resolve(
      data,
      {
        authorNames: 'Alice Example,No name fallback,Charlie Example,,Alice again',
        authorEmails: 'alice@example.com,missing@example.com,,,alice@example.com',
      },
      { importing: true, transacting },
    );

    assert.deepEqual(resolved.authors, [{ id: 'author-alice' }, { id: 'author-charlie' }]);
    assert.deepEqual(
      findUser.getCalls().map((call) => call.args[0]),
      [
        { email: 'alice@example.com' },
        { email: 'missing@example.com' },
        { slug: 'charlie-example' },
        { email: 'alice@example.com' },
      ],
      'an email-bearing entry never falls back to its name',
    );
    for (const call of findUser.getCalls()) {
      assert.deepEqual(call.args[1], { importing: true, transacting });
    }
    sinon.assert.notCalled(findTag);
  });

  it('omits authors when no supplied reference matches', async function () {
    const findUser = sinon.stub().resolves(null);
    const resolver = new BookshelfPostRelationsResolver({
      User: { findOne: findUser },
      Tag: { findOne: sinon.stub().resolves(null) },
    });

    const resolved = await resolver.resolve(
      data,
      { authorNames: 'Missing Author' },
      { importing: true },
    );

    assert.equal('authors' in resolved, false, 'the model retains its Owner fallback');
    sinon.assert.calledWithMatch(findUser, { slug: 'missing-author' });
  });

  it('matches tags by exact name, explicit slug, then normalized slug', async function () {
    const findTag = sinon.stub().callsFake(async (lookup: { name?: string; slug?: string }) => {
      if (lookup.name === 'Exact Name') {
        return relation('tag-exact');
      }
      if (lookup.slug === 'explicit-slug') {
        return relation('tag-explicit-slug');
      }
      if (lookup.slug === 'needs-normalizing') {
        return relation('tag-normalized');
      }
      return null;
    });
    const resolver = new BookshelfPostRelationsResolver({
      User: { findOne: sinon.stub().resolves(null) },
      Tag: { findOne: findTag },
    });

    const resolved = await resolver.resolve(
      data,
      {
        tagNames: 'Exact Name,explicit-slug,Needs Normalizing,Missing Tag,Exact Name',
      },
      { importing: true },
    );

    assert.deepEqual(resolved.tags, [
      { id: 'tag-exact' },
      { id: 'tag-explicit-slug' },
      { id: 'tag-normalized' },
      { name: '#Import batch' },
    ]);
    assert.deepEqual(
      findTag.getCalls().map((call) => call.args[0]),
      [
        { name: 'Exact Name' },
        { name: 'explicit-slug' },
        { slug: 'explicit-slug' },
        { name: 'Needs Normalizing' },
        { slug: 'Needs Normalizing' },
        { slug: 'needs-normalizing' },
        { name: 'Missing Tag' },
        { slug: 'Missing Tag' },
        { slug: 'missing-tag' },
        { name: 'Exact Name' },
      ],
    );
  });

  it('does no lookups when relation cells are absent', async function () {
    const findUser = sinon.stub().resolves(null);
    const findTag = sinon.stub().resolves(null);
    const resolver = new BookshelfPostRelationsResolver({
      User: { findOne: findUser },
      Tag: { findOne: findTag },
    });

    const resolved = await resolver.resolve(data, {}, { importing: true });

    assert.deepEqual(resolved, data);
    assert.notEqual(resolved, data, 'callers receive data they can safely change');
    sinon.assert.notCalled(findUser);
    sinon.assert.notCalled(findTag);
  });

  it('propagates lookup failures to roll back the row transaction', async function () {
    const failure = new Error('author lookup failed');
    const resolver = new BookshelfPostRelationsResolver({
      User: { findOne: sinon.stub().rejects(failure) },
      Tag: { findOne: sinon.stub().resolves(null) },
    });

    await assert.rejects(
      resolver.resolve(data, { authorEmails: 'author@example.com' }, { importing: true }),
      failure,
    );
  });
});
