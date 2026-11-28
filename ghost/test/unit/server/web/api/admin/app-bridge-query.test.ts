import assert from 'node:assert/strict';
import request from 'supertest';

import { checkAdminApiRequest, readQuery } from '@tryghost/app-contracts/bridge';

import { parseQueryBooleans } from '../../../../../../core/server/web/api/middleware/parse-query-booleans';

const ROOT = new URL('https://site.example/ghost/api/admin/');

/**
 * An Express app as Ghost sets one up, reading a query as the Admin API's app does: Express's
 * query parser as `shared/express` configures it, then the Admin API's own middleware over the
 * result (`web/api/endpoints/admin/app.js`). It answers with the query it read.
 */
function queryEcho() {
  const app = require('../../../../../../core/shared/express')('query echo');
  app.use(parseQueryBooleans);
  app.get('*', (req: { query: unknown }, res: { json(body: unknown): void }) =>
    res.json(req.query),
  );
  return app;
}

/**
 * What the bridge makes of a query an app wrote, on a route with no server gaps: the reason it
 * refuses it, or the parameters it held and the query it sends in their place.
 */
function bridged(written: string) {
  const check = checkAdminApiRequest({ path: `/tags/?${written}` }, ROOT, new Set(['tag:browse']));
  if (check.problem) {
    assert.equal(check.problem, 'blocked', written);
    return { refused: true } as const;
  }
  // The bridge reads the query the URL parser gives it
  const read = readQuery(new URL(`./tags/?${written}`, ROOT).search);
  assert.ok('parameters' in read, written);
  return { refused: false, held: Object.fromEntries(read.parameters), sent: check.url.search };
}

// Ghost reads `true` and `false` as booleans, whoever sent them
const asGhostReads = (held: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(held).map(([name, value]) => [
      name,
      value === 'true' ? true : value === 'false' ? false : value,
    ]),
  );

// Admin's bridge refuses and rewrites an app's request by its query parameters, so the server
// has to read the same parameters the bridge did. It doesn't copy how Ghost parses a query: it
// reads an app's query strictly and sends one it wrote itself. Each query here is either
// refused by the bridge, or read by Ghost's own parser as exactly the names and values the
// bridge held.
describe('the query the app bridge sends, as Ghost reads it', function () {
  const app = queryEcho();
  const parse = (search: string): Record<string, unknown> =>
    parseQueryBooleansOf(app.get('query parser fn')(search.replace(/^\?/, '')));
  const parseQueryBooleansOf = (query: Record<string, unknown>) => {
    const req = { query };
    parseQueryBooleans(req as never, {} as never, () => {});
    return req.query;
  };

  const NAMES = ['include', 'fields', 'order', 'filter', 'newsletter', 'email_segment', 'source'];
  const escaped = (name: string) =>
    name.replace(/^./, (first) => `%${first.charCodeAt(0).toString(16)}`);
  const spellings = (name: string) => [
    name,
    `[${name}]`,
    `${name}[]`,
    `${name}[0]`,
    `${name}[a]`,
    `${name}[a][b]`,
    `[${name}][a]`,
    `[${name}]x`,
    `[[${name}]]`,
    `[${name}`,
    `${name}]`,
    `${name}[`,
    `a[${name}]`,
    `${name}.a`,
    ` ${name}`,
    `${name} `,
    name.toUpperCase(),
    `${name}%5B%5D`,
    `${name}%5b%5d`,
    `%5B${name}%5D`,
    `${name}%255B%255D`,
    escaped(name),
    `${escaped(name)}[%ff]`,
    `${escaped(name)}%5B%ff%5D`,
    `${name}[%ff]`,
    `${name}%`,
    `${name}%zz`,
    `${name}%e0%a4`,
    `${name}%00`,
    `${name}+`,
    `${name};a`,
    '__proto__',
    'constructor',
    'toString',
  ];
  // What an app might write as a value, escaped or not
  const VALUES = [
    'x',
    '',
    'a,b',
    'true',
    'false',
    'a=b',
    'a]=b',
    'a%5D=b',
    'a%5d',
    '%5B%5D',
    '[]',
    '[',
    'tag:[a,b]+x:1',
    'tag:%5Ba,b%5D%2Bx:1',
    "slug:'a%2Cb'",
    '%ff',
    '%25ff',
    '%',
    '%zz',
    '%00',
    '%78+%2C',
    'a%26b%3Dc',
    'a&b',
    'a;b',
    'a#b',
    '%E2%9C%93',
    '✓',
    '&#10003;',
    'utf8=%E2%9C%93',
    '{"a":[1]}',
    '%7B%22a%22%3A%5B1%5D%7D',
  ];
  const queries = (key: string, value: string) => [
    `${key}=${value}`,
    key,
    `x=${key}]=${value}`,
    `x]=${key}=${value}`,
    `${key}=${value}&${key}=y`,
    `a=1&${key}=${value}`,
    `${key}=${value}&`,
  ];

  it('is read by Ghost’s parser as exactly the parameters the bridge held, or was never sent', function () {
    let sent = 0;
    let refused = 0;
    const readBack = new Map<string, number>();
    for (const name of NAMES) {
      for (const key of spellings(name)) {
        for (const value of VALUES) {
          for (const written of queries(key, value)) {
            const result = bridged(written);
            if (result.refused) {
              refused += 1;
              continue;
            }
            assert.deepEqual(
              parse(result.sent),
              asGhostReads(result.held),
              `?${written} was sent as ${result.sent}`,
            );
            sent += 1;
            if (Object.hasOwn(result.held, name)) {
              readBack.set(name, (readBack.get(name) ?? 0) + 1);
            }
          }
        }
      }
    }
    assert.ok(sent > 1000, `sent only ${sent} queries`);
    assert.ok(refused > 5000, `refused only ${refused} queries`);
    for (const name of NAMES) {
      assert.ok((readBack.get(name) ?? 0) > 50, `Ghost read ${name} in only ${readBack.get(name)}`);
    }
  });

  it('holds the value an app meant, whatever it is made of', function () {
    for (const [written, held] of [
      ['filter=tag:[a,b]%2Bx:1', { filter: 'tag:[a,b]+x:1' }],
      ['filter=a]=b', { filter: 'a]=b' }],
      ['filter=%5B%5D', { filter: '[]' }],
      ['filter=a+b', { filter: 'a b' }],
      ['filter=%25ff', { filter: '%ff' }],
      ["filter=slug:'a%2Cb'&limit=5", { filter: "slug:'a,b'", limit: '5' }],
      ['include', { include: '' }],
    ] as const) {
      const result = bridged(written);
      assert.deepEqual(!result.refused && result.held, held, written);
    }
  });

  // The same, over HTTP: through Node's reading of the request line and Express's own
  // middleware, for every value above and some that only a real request carries
  it('reaches a Ghost Express app over HTTP as the parameters the bridge held', async function () {
    const names = ['filter', 'include', 'fields'];
    const written = VALUES.map((value, index) => `${names[index % names.length]}=${value}&limit=5`);
    written.push(
      `filter=${'%00'.repeat(3)}`,
      `filter=${encodeURIComponent('\u{1F600}\u0000\r\n\t "\'<>\\^`{|}~')}`,
      `filter=${'a'.repeat(1500)}`,
      Array.from({ length: 100 }, (_, index) => `p${index}=${index}`).join('&'),
    );

    let sent = 0;
    for (const query of written) {
      const result = bridged(query);
      if (result.refused) {
        continue;
      }
      const response = await request(app).get(`/tags/${result.sent}`).expect(200);
      assert.deepEqual(
        response.body,
        asGhostReads(result.held),
        `?${query} sent as ${result.sent}`,
      );
      sent += 1;
    }
    assert.ok(sent > 25, `sent only ${sent} queries`);
  });

  // Ghost's parser reads 1,000 parameters and drops the rest without an error
  it('sends fewer parameters than Ghost’s parser reads', function () {
    const many = (count: number) =>
      Array.from({ length: count }, (_, index) => `p${index}=1`).join('&');

    const most = bridged(many(100));
    assert.ok(!most.refused);
    assert.equal(Object.keys(parse(most.sent)).length, 100);
    assert.equal(bridged(many(101)).refused, true);
    assert.equal(Object.keys(parse(many(1001))).length, 1000);
  });
});
