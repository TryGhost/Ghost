import assert from 'node:assert/strict';
import type { AppPermissionKey } from '@tryghost/app-contracts';
import { generateTestAppKeys, type TestAppKeys } from '../../utils/app-identity';
import { insertTestInstallation, issueTestAppToken } from '../../utils/app-installations';
import { appRequests } from '../../utils/app-requests';
import { agentProvider, fixtureManager } from '../../utils/e2e-framework';

const models = require('../../../core/server/models');
const configUtils = require('../../utils/config-utils');

// Apps get tokens from Better Auth's OAuth provider, so they work only under its engine
const isBetterAuth = configUtils.config.get('auth:engine') === 'better-auth';

type Post = Record<string, unknown> & { authors?: Array<Record<string, unknown>> };

/**
 * What a post or page in a response carries that the app's scopes here never cover: its related
 * objects, how it performed, and its authors' roles.
 */
function uncovered(post: Post): string[] {
  const found = ['tags', 'tiers', 'newsletter', 'email', 'count', 'sentiment'].filter(
    (key) => key in post,
  );
  if (post.authors?.some((author) => 'roles' in author)) {
    found.push('authors.roles');
  }
  return found;
}

/**
 * Admin's bridge covers what Ghost's server doesn't check yet by refusing or rewriting an app's
 * request, so it has to read the request as the server will. Each test here sends a request
 * through the bridge's check and on to the real Admin API with a real app token, and looks at
 * what comes back: a request the bridge read one way and the server another shows up as
 * something in the response the app has no scope for.
 */
describe.skipIf(!isBetterAuth)('What an app gets through Admin’s bridge', function () {
  type Agent = Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>> & { [key: string]: any };
  let agent: Agent;
  let keys: TestAppKeys;
  const knex = () => models.Base.knex;
  const owner = () => fixtureManager.get('users', 0);

  /** Sends requests as Admin does for an app approved for `scopes`, acting for the Owner. */
  async function appWith(scopes: AppPermissionKey[]) {
    const installationId = await insertTestInstallation(knex(), { scopes, keys });
    const { token } = await issueTestAppToken(knex(), {
      installationId,
      userId: owner().id,
      clientScopes: scopes,
    });
    const { bridged } = appRequests(agent, token, scopes);
    return (method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown) =>
      bridged({ method, path, body });
  }

  beforeAll(async function () {
    agent = (await agentProvider.getAdminAPIAgent()) as Agent;
    await fixtureManager.init('users', 'posts', 'newsletters');
    keys = await generateTestAppKeys();
    agent.clearCookies();
  });

  afterEach(async function () {
    await knex()('oauth_access_tokens').del();
    await knex()('oauth_clients').del();
    await knex()('app_installation_manifests').del();
    await knex()('app_installations').del();
    await knex()('user_sessions').del();
  });

  // Ghost reads `fields` on a read only: a write answers with its default includes whatever
  // `fields` says.
  it('answers a write with nothing beyond the post, whatever fields it asks for', async function () {
    const send = await appWith(['post:add', 'post:edit']);

    for (const resource of ['posts', 'pages'] as const) {
      for (const query of ['', '?fields=id', '?fields=id,title&formats=lexical']) {
        const made = await send('POST', `/${resource}/${query}`, {
          [resource]: [{ title: 'From an app' }],
        });
        assert.ok('status' in made && made.status === 201, `POST /${resource}/${query}`);
        assert.deepEqual(uncovered(made.body[resource][0]), [], `POST /${resource}/${query}`);

        const { id, updated_at: updatedAt } = made.body[resource][0];
        const edited = await send('PUT', `/${resource}/${id}/${query}`, {
          [resource]: [{ updated_at: updatedAt }],
        });
        assert.ok('status' in edited && edited.status === 200, `PUT /${resource}/:id/${query}`);
        assert.deepEqual(uncovered(edited.body[resource][0]), [], `PUT /${resource}/:id/${query}`);
      }
    }
  });

  // The bridge names the includes an app may have on every post and page request that names
  // none, a read that asks for some `fields` included, so Ghost's own defaults never apply.
  it('answers a read that asks for some fields with those, and the relations the app may have', async function () {
    const send = await appWith(['post:browse', 'post:read']);
    const postId = fixtureManager.get('posts', 0).id;

    for (const path of ['/posts/', `/posts/${postId}/`, '/pages/']) {
      const resource = path.startsWith('/posts') ? 'posts' : 'pages';
      for (const fields of ['id,title', 'id', 'title,slug']) {
        const answered = await send('GET', `${path}?fields=${fields}`);
        const label = `GET ${path}?fields=${fields}`;
        assert.ok(
          'status' in answered && answered.status === 200,
          `${label}: ${JSON.stringify(answered).slice(0, 600)}`,
        );
        const asked = fields.split(',');
        for (const post of answered.body[resource] as Post[]) {
          assert.deepEqual(uncovered(post), [], label);
          // The fields asked for, with the id Ghost adds to a read of one post, and no
          // relation but the authors, which need no scope
          const unasked = Object.keys(post).filter(
            (key) => !asked.includes(key) && key !== 'authors' && key !== 'id',
          );
          assert.ok('authors' in post, label);
          assert.deepEqual(unasked, [], label);
        }
      }
    }
  });

  // The bridge sends a query it wrote itself, so what it read is what Ghost reads. Each of these
  // is a query Ghost's parser reads differently from a URL parser: the bridge either refuses it
  // or sends it as the parameters it held.
  it('answers a read with nothing beyond the post, however its query is written', async function () {
    const send = await appWith(['post:browse', 'post:read']);
    const postId = fixtureManager.get('posts', 0).id;
    const filler = (count: number) =>
      Array.from({ length: count }, (_, index) => `p${index}=1`).join('&');

    const leaks: string[] = [];
    let answers = 0;
    let refusals = 0;
    for (const query of [
      '',
      '?limit=2',
      `?${filler(100)}`,
      `?${filler(99)}`,
      `?${filler(101)}`,
      `?${filler(1001)}`,
      '?fields=',
      '?fields=id,title',
      '?fields=false',
      '?fields=true',
      '?fields=%20',
      '?fields=,',
      '?include=authors',
      '?include=',
      '?include=,',
      '?include=false',
      '?include=true',
      '?include=authors%26x',
      '?include=authors&include=',
      '?include=&include=authors',
      '?include[]=authors&include[]=',
      // Ghost splits a pair on `]=` before it looks for `=`
      '?fields=a]=b',
      '?fields=a%5D=b',
      '?include=x]=authors',
      '?include=authors]=x',
      '?x=include]=email',
      // A name Ghost leaves undecoded, as one escape in it is malformed
      '?%66ields[%ff]=id',
      '?%69nclude[%ff]=authors',
      '?%66ields%5B%ff%5D=id',
      '?fields[=id',
      '?include[=authors',
      '?[fields=id',
      '?[include=authors',
      '?[include]=email',
      '?%5Binclude%5D=email',
      '?fields%00=id',
      '?include%00=authors',
      '?FIELDS=id',
      '?Include=authors',
      '?fields=false&fields=false',
      '?fields[]=false',
      '?include[a]=authors',
      '?include[0]=authors',
      '?include[a][b]=authors',
      '?fields[a]=id',
      '?fields[]=id',
      '?fields=&fields=',
      '?fields.a=id',
      '?include.a=authors',
      '?fields;x=id',
      '?include=authors;fields=id',
      '?x=1;include=authors',
    ]) {
      for (const path of ['/posts/', `/posts/${postId}/`, '/pages/']) {
        const answered = await send('GET', `${path}${query}`);
        if ('refused' in answered) {
          refusals += 1;
          continue;
        }
        const resource = path.startsWith('/posts') ? 'posts' : 'pages';
        const label = `GET ${path}${query.length > 80 ? `${query.slice(0, 80)}…` : query}`;
        // Ghost may refuse the request itself, which gives nothing away
        if (answered.status !== 200) {
          assert.ok(
            answered.status >= 400 && answered.status < 500,
            `${label}: ${JSON.stringify(answered)}`,
          );
          continue;
        }
        answers += 1;
        const found = new Set((answered.body[resource] as Post[]).flatMap(uncovered));
        if (found.size > 0) {
          leaks.push(`${label} answered with ${[...found].join(', ')}`);
        }
      }
    }
    assert.deepEqual(leaks, []);
    assert.ok(answers > 30, `Ghost answered only ${answers} of these`);
    assert.ok(refusals > 60, `the bridge refused only ${refusals} of these`);
  });

  it('refuses a copy, which answers with a post the app may not be able to read', async function () {
    const send = await appWith(['post:add']);
    const postId = fixtureManager.get('posts', 0).id;

    for (const path of [`/posts/${postId}/copy/`, `/pages/${postId}/copy/`]) {
      assert.deepEqual(await send('POST', path), { refused: 'blocked' }, path);
    }
  });
});
