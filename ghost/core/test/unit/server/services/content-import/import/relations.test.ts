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
  getByEmail: sinon.SinonStub = sinon.stub().resolves(undefined),
) => ({ findOne, getByEmail, add, getOwnerUser });
const tagModels = (
  findOne: sinon.SinonStub = sinon.stub().resolves(null),
  add: sinon.SinonStub = sinon.stub().resolves(relation('tag-created')),
) => ({ findOne, add });

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
    const getUserByEmail = sinon.stub().callsFake(async (email: string) => {
      if (email === 'alice@example.com') {
        return relation('author-alice');
      }
      return undefined;
    });
    const findUser = sinon.stub().callsFake(async (lookup: { slug?: string }) => {
      if (lookup.slug === 'charlie-example') {
        return relation('author-charlie');
      }
      return null;
    });
    const findTag = sinon.stub().resolves(null);
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(findUser, undefined, undefined, getUserByEmail),
      Tag: tagModels(findTag),
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
      getUserByEmail.getCalls().map((call) => call.args[0]),
      ['alice@example.com', 'missing@example.com'],
      'duplicate emails reuse the first match',
    );
    sinon.assert.calledOnceWithExactly(
      findUser,
      { slug: 'charlie-example' },
      {
        importing: true,
        transacting,
      },
    );
    for (const call of getUserByEmail.getCalls()) {
      assert.deepEqual(call.args[1], { importing: true, transacting });
    }
    sinon.assert.notCalled(findTag);
  });

  it('falls back to Owner with a warning when a name-only author does not match', async function () {
    const findUser = sinon.stub().resolves(null);
    const getOwnerUser = sinon.stub().resolves(relation('owner'));
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(findUser, undefined, getOwnerUser),
      Tag: tagModels(),
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
      User: userModels(findUser, addUser, getOwnerUser, sinon.stub().resolves(undefined)),
      Tag: tagModels(),
    });
    const options = { importing: true, context: { internal: true }, transacting: {} };

    const resolved = await resolver.resolve(
      data,
      { authorNames: 'New Contributor', authorEmails: 'new@example.com' },
      options,
    );

    assert.deepEqual(resolved.data.authors, [{ id: 'author-created' }]);
    assert.deepEqual(resolved.warnings, []);
    sinon.assert.notCalled(findUser);
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
    const findUser = sinon.stub().resolves(null);
    const getUserByEmail = sinon.stub().resolves(relation('author-existing'));
    const addUser = sinon.stub().resolves(relation('author-created'));
    const getOwnerUser = sinon.stub().resolves(relation('owner'));
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(findUser, addUser, getOwnerUser, getUserByEmail),
      Tag: tagModels(),
    });

    const resolved = await resolver.resolve(
      data,
      { authorEmails: 'existing@example.com' },
      { importing: true },
    );

    assert.deepEqual(resolved.data.authors, [{ id: 'author-existing' }]);
    assert.deepEqual(resolved.warnings, []);
    sinon.assert.calledOnceWithExactly(getUserByEmail, 'existing@example.com', {
      importing: true,
    });
    sinon.assert.notCalled(findUser);
    sinon.assert.notCalled(addUser);
    sinon.assert.notCalled(getOwnerUser);
  });

  it('reuses a contributor created for a duplicate email in the same row', async function () {
    const findUser = sinon.stub().resolves(null);
    const getUserByEmail = sinon.stub().resolves(undefined);
    const addUser = sinon.stub().resolves(relation('author-created'));
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(findUser, addUser, undefined, getUserByEmail),
      Tag: tagModels(),
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
    sinon.assert.calledOnceWithExactly(getUserByEmail, 'new@example.com', { importing: true });
    sinon.assert.notCalled(findUser);
    sinon.assert.calledOnce(addUser);
    sinon.assert.calledWithMatch(addUser, { email: 'new@example.com' });
  });

  it('falls back to Owner for email-only, invalid, and empty entries with clear warnings', async function () {
    const findUser = sinon.stub().resolves(null);
    const getUserByEmail = sinon.stub().resolves(undefined);
    const addUser = sinon.stub().resolves(relation('author-created'));
    const getOwnerUser = sinon.stub().resolves(relation('owner'));
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(findUser, addUser, getOwnerUser, getUserByEmail),
      Tag: tagModels(),
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
    sinon.assert.calledOnceWithExactly(getUserByEmail, 'missing@example.com', {
      importing: true,
    });
    sinon.assert.notCalled(findUser);
    sinon.assert.notCalled(addUser);
    sinon.assert.calledOnce(getOwnerUser);
  });

  it('does not duplicate Owner when an existing match is followed by an Owner fallback', async function () {
    const owner = relation('owner');
    const getUserByEmail = sinon.stub().callsFake(async (email: string) => {
      return email === 'owner@example.com' ? owner : undefined;
    });
    const getOwnerUser = sinon.stub().resolves(owner);
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(undefined, undefined, getOwnerUser, getUserByEmail),
      Tag: tagModels(),
    });

    const resolved = await resolver.resolve(
      data,
      {
        authorNames: 'Site Owner,Missing Author',
        authorEmails: 'owner@example.com,',
      },
      { importing: true },
    );

    assert.deepEqual(resolved.data.authors, [{ id: 'owner' }]);
    assert.deepEqual(resolved.warnings, [
      'Author "Missing Author" has no email; assigned Owner instead.',
    ]);
    sinon.assert.calledOnce(getOwnerUser);
  });

  it('propagates author creation failures so the row transaction can roll back', async function () {
    const failure = new Error('user creation failed');
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(sinon.stub().resolves(null), sinon.stub().rejects(failure)),
      Tag: tagModels(),
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
      Tag: tagModels(),
    });

    await assert.rejects(
      resolver.resolve(data, { authorNames: 'Missing Author' }, { importing: true }),
      failure,
    );
  });

  it('matches tags by exact name, explicit slug, and normalized slug before creating the rest', async function () {
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
    const addTag = sinon.stub().resolves(relation('tag-created'));
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(),
      Tag: tagModels(findTag, addTag),
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
      { id: 'tag-created' },
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
    sinon.assert.calledOnceWithExactly(addTag, { name: 'Missing Tag' }, { importing: true });
  });

  it('reuses a tag created for duplicate inputs while preserving source order', async function () {
    let created: { id: string } | null = null;
    const findTag = sinon.stub().callsFake(async (lookup: { name?: string }) => {
      return lookup.name === 'New Tag' ? created : null;
    });
    const addTag = sinon.stub().callsFake(async () => {
      created = relation('tag-created');
      return created;
    });
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(),
      Tag: tagModels(findTag, addTag),
    });
    const options = { importing: true, transacting: {} };

    const resolved = await resolver.resolve(data, { tagNames: 'New Tag,New Tag' }, options);

    assert.deepEqual(resolved.data.tags, [{ id: 'tag-created' }, { name: '#Import batch' }]);
    sinon.assert.calledOnceWithExactly(addTag, { name: 'New Tag' }, options);
  });

  for (const code of ['ER_DUP_ENTRY', 'SQLITE_CONSTRAINT_UNIQUE']) {
    it(`refetches a concurrently created tag after ${code}`, async function () {
      const duplicate = Object.assign(new Error('duplicate tag'), { code });
      const findTag = sinon.stub().callsFake(async (_lookup: object, options: object) => {
        return 'forUpdate' in options ? relation('tag-concurrent') : null;
      });
      const addTag = sinon.stub().rejects(duplicate);
      const resolver = new BookshelfPostRelationsResolver({
        User: userModels(),
        Tag: tagModels(findTag, addTag),
      });
      const options = { importing: true, transacting: {} };

      const resolved = await resolver.resolve(data, { tagNames: 'Concurrent Tag' }, options);

      assert.deepEqual(resolved.data.tags, [{ id: 'tag-concurrent' }, { name: '#Import batch' }]);
      sinon.assert.calledOnceWithExactly(addTag, { name: 'Concurrent Tag' }, options);
      sinon.assert.calledWithExactly(
        findTag.lastCall,
        { name: 'Concurrent Tag' },
        {
          ...options,
          forUpdate: true,
        },
      );
    });
  }

  it('rethrows a duplicate error when the concurrent tag cannot be refetched', async function () {
    const duplicate = Object.assign(new Error('duplicate tag'), { code: 'ER_DUP_ENTRY' });
    const findTag = sinon.stub().resolves(null);
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(),
      Tag: tagModels(findTag, sinon.stub().rejects(duplicate)),
    });

    await assert.rejects(
      resolver.resolve(data, { tagNames: 'Missing Concurrent Tag' }, { importing: true }),
      duplicate,
    );
    assert.equal(
      findTag.getCalls().filter((call) => call.args[1].forUpdate).length,
      3,
      'every supported lookup is retried with a locking read',
    );
  });

  it('propagates non-duplicate tag creation failures without refetching', async function () {
    const failure = Object.assign(new Error('tag creation failed'), { code: 'ECONNRESET' });
    const findTag = sinon.stub().resolves(null);
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(),
      Tag: tagModels(findTag, sinon.stub().rejects(failure)),
    });

    await assert.rejects(
      resolver.resolve(data, { tagNames: 'Broken Tag' }, { importing: true }),
      failure,
    );
    assert.equal(findTag.getCalls().filter((call) => call.args[1].forUpdate).length, 0);
  });

  it('propagates tag creation failures without an error code', async function () {
    const failure = new Error('tag creation failed');
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(),
      Tag: tagModels(sinon.stub().resolves(null), sinon.stub().rejects(failure)),
    });

    await assert.rejects(
      resolver.resolve(data, { tagNames: 'Broken Tag' }, { importing: true }),
      failure,
    );
  });

  it('does no lookups when relation cells are absent', async function () {
    const findUser = sinon.stub().resolves(null);
    const findTag = sinon.stub().resolves(null);
    const resolver = new BookshelfPostRelationsResolver({
      User: userModels(findUser),
      Tag: tagModels(findTag),
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
      User: userModels(undefined, undefined, undefined, sinon.stub().rejects(failure)),
      Tag: tagModels(),
    });

    await assert.rejects(
      resolver.resolve(data, { authorEmails: 'author@example.com' }, { importing: true }),
      failure,
    );
  });
});
