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
const userModels = (
  findOne: sinon.SinonStub = sinon.stub().resolves(null),
  add: sinon.SinonStub = sinon.stub().resolves(relation('author-created')),
  getOwnerUser: sinon.SinonStub = sinon.stub().resolves(relation('owner')),
) => ({ findOne, add, getOwnerUser });

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
      User: userModels(findUser),
      Tag: { findOne: findTag },
    });
    const transacting = { transaction: true };

    const resolved = await resolver.resolve(
      data,
      {
        authorNames: 'Alice Example,No name fallback,Charlie Example,Alice again',
        authorEmails: 'alice@example.com,missing@example.com,,alice@example.com',
      },
      { importing: true, transacting },
    );

    assert.deepEqual(resolved.data.authors, [
      { id: 'author-alice' },
      { id: 'author-created' },
      { id: 'author-charlie' },
    ]);
    assert.deepEqual(resolved.warnings, []);
    assert.deepEqual(
      findUser.getCalls().map((call) => call.args[0]),
      [
        { email: 'alice@example.com' },
        { email: 'missing@example.com' },
        { slug: 'charlie-example' },
      ],
      'email-bearing entries never fall back to names and duplicates reuse the first match',
    );
    for (const call of findUser.getCalls()) {
      assert.deepEqual(call.args[1], { importing: true, transacting });
    }
    sinon.assert.notCalled(findTag);
  });

  it('falls back to Owner with a warning when a name-only author does not match', async function () {
    const findUser = sinon.stub().resolves(null);
    const getOwnerUser = sinon.stub().resolves(relation('owner'));
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(findUser, undefined, getOwnerUser),
      Tag: { findOne: sinon.stub().resolves(null) },
    });

    const resolved = await resolver.resolve(
      data,
      { authorNames: 'Missing Author' },
      { importing: true },
    );

    assert.deepEqual(resolved.data.authors, [{ id: 'owner' }]);
    assert.deepEqual(resolved.warnings, [
      'Author "Missing Author" has no email; assigned Owner instead.',
    ]);
    sinon.assert.calledWithMatch(findUser, { slug: 'missing-author' });
    sinon.assert.calledOnce(getOwnerUser);
  });

  it('creates an unmatched named author as a locked Contributor through the importing path', async function () {
    const findUser = sinon.stub().resolves(null);
    const addUser = sinon.stub().resolves(relation('author-created'));
    const getOwnerUser = sinon.stub().resolves(relation('owner'));
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(findUser, addUser, getOwnerUser),
      Tag: { findOne: sinon.stub().resolves(null) },
    });
    const options = { importing: true, context: { internal: true }, transacting: {} };

    const resolved = await resolver.resolve(
      data,
      { authorNames: 'New Contributor', authorEmails: 'new@example.com' },
      options,
    );

    assert.deepEqual(resolved.data.authors, [{ id: 'author-created' }]);
    assert.deepEqual(resolved.warnings, []);
    sinon.assert.calledWithExactly(findUser, { email: 'new@example.com' }, options);
    sinon.assert.calledWithExactly(
      addUser,
      {
        name: 'New Contributor',
        email: 'new@example.com',
        roles: ['Contributor'],
      },
      options,
    );
    sinon.assert.notCalled(getOwnerUser);
  });

  it('matches an existing author by email without requiring a supplied name', async function () {
    const findUser = sinon.stub().resolves(relation('author-existing'));
    const addUser = sinon.stub().resolves(relation('author-created'));
    const getOwnerUser = sinon.stub().resolves(relation('owner'));
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(findUser, addUser, getOwnerUser),
      Tag: { findOne: sinon.stub().resolves(null) },
    });

    const resolved = await resolver.resolve(
      data,
      { authorEmails: 'existing@example.com' },
      { importing: true },
    );

    assert.deepEqual(resolved.data.authors, [{ id: 'author-existing' }]);
    assert.deepEqual(resolved.warnings, []);
    sinon.assert.notCalled(addUser);
    sinon.assert.notCalled(getOwnerUser);
  });

  it('reuses a contributor created for a duplicate email in the same row', async function () {
    const findUser = sinon.stub().resolves(null);
    const addUser = sinon.stub().resolves(relation('author-created'));
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(findUser, addUser),
      Tag: { findOne: sinon.stub().resolves(null) },
    });

    const resolved = await resolver.resolve(
      data,
      {
        authorNames: 'New Contributor,Duplicate Name',
        authorEmails: 'NEW@example.com,new@example.com',
      },
      { importing: true },
    );

    assert.deepEqual(resolved.data.authors, [{ id: 'author-created' }]);
    sinon.assert.calledOnce(findUser);
    sinon.assert.calledOnce(addUser);
  });

  it('falls back to Owner for email-only, invalid, and empty entries with clear warnings', async function () {
    const findUser = sinon.stub().resolves(null);
    const addUser = sinon.stub().resolves(relation('author-created'));
    const getOwnerUser = sinon.stub().resolves(relation('owner'));
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(findUser, addUser, getOwnerUser),
      Tag: { findOne: sinon.stub().resolves(null) },
    });

    const resolved = await resolver.resolve(
      data,
      {
        authorNames: ',Invalid Author,',
        authorEmails: 'missing@example.com,not-an-email,',
      },
      { importing: true },
    );

    assert.deepEqual(resolved.data.authors, [{ id: 'owner' }]);
    assert.deepEqual(resolved.warnings, [
      'Author email "missing@example.com" has no name; assigned Owner instead.',
      'Author email "not-an-email" is invalid; assigned Owner instead.',
      'An empty author entry was assigned to Owner instead.',
    ]);
    sinon.assert.calledOnceWithExactly(
      findUser,
      { email: 'missing@example.com' },
      {
        importing: true,
      },
    );
    sinon.assert.notCalled(addUser);
    sinon.assert.calledOnce(getOwnerUser);
  });

  it('propagates author creation failures so the row transaction can roll back', async function () {
    const failure = new Error('user creation failed');
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(sinon.stub().resolves(null), sinon.stub().rejects(failure)),
      Tag: { findOne: sinon.stub().resolves(null) },
    });

    await assert.rejects(
      resolver.resolve(
        data,
        { authorNames: 'New Contributor', authorEmails: 'new@example.com' },
        { importing: true },
      ),
      failure,
    );
  });

  it('propagates Owner lookup failures so the row transaction can roll back', async function () {
    const failure = new Error('owner lookup failed');
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(sinon.stub().resolves(null), undefined, sinon.stub().rejects(failure)),
      Tag: { findOne: sinon.stub().resolves(null) },
    });

    await assert.rejects(
      resolver.resolve(data, { authorNames: 'Missing Author' }, { importing: true }),
      failure,
    );
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
      User: userModels(),
      Tag: { findOne: findTag },
    });

    const resolved = await resolver.resolve(
      data,
      {
        tagNames: 'Exact Name,explicit-slug,Needs Normalizing,Missing Tag,Exact Name',
      },
      { importing: true },
    );

    assert.deepEqual(resolved.data.tags, [
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
      User: userModels(findUser),
      Tag: { findOne: findTag },
    });

    const resolved = await resolver.resolve(data, {}, { importing: true });

    assert.deepEqual(resolved, { data, warnings: [] });
    assert.notEqual(resolved.data, data, 'callers receive data they can safely change');
    sinon.assert.notCalled(findUser);
    sinon.assert.notCalled(findTag);
  });

  it('propagates lookup failures to roll back the row transaction', async function () {
    const failure = new Error('author lookup failed');
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(sinon.stub().rejects(failure)),
      Tag: { findOne: sinon.stub().resolves(null) },
    });

    await assert.rejects(
      resolver.resolve(data, { authorEmails: 'author@example.com' }, { importing: true }),
      failure,
    );
  });
});
