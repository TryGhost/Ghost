import { describe, expect, it } from 'vitest';

import { checkAdminApiRequest } from '../../src/bridge/resolve.ts';
import type { FetchMethod } from '../../src/bridge/rules.ts';
import {
  SERVER_GAPS,
  scopeForField,
  type FieldsGap,
  type ServerGap,
  type ServerGapName,
} from '../../src/bridge/server-gaps.ts';
import {
  APP_PERMISSION_KEYS,
  isAppPermissionKey,
  type AppPermissionKey,
} from '../../src/scopes.ts';

const ID = '5ddc9141c35e7700383b2937';
const root = new URL('https://site.example/ghost/api/admin/');

const GAPS: Record<string, ServerGap> = SERVER_GAPS;
const FIELD_GAPS: FieldsGap[] = [
  SERVER_GAPS.postFields,
  SERVER_GAPS.pageFields,
  SERVER_GAPS.searchIndexFields,
  SERVER_GAPS.newsletterFields,
];

// Every scope but the stats one, unless a test says otherwise.
const APPROVED = new Set(APP_PERMISSION_KEYS.filter((name) => name !== 'post:readStats'));

interface Sent {
  method?: FetchMethod;
  body?: string;
  approved?: ReadonlySet<AppPermissionKey>;
}

/** What the bridge makes of a request: the query it sends, or the gap and reason it refused by. */
function sent(path: string, { method = 'GET', body, approved = APPROVED }: Sent = {}) {
  const result = checkAdminApiRequest({ path, method, body }, root, approved);
  if (result.problem === 'blocked') {
    return { gap: result.gap, detail: result.detail };
  }
  expect(result.problem, path).toBeUndefined();
  return (result as { url: URL }).url.search;
}

const refusedBy = (gap: ServerGapName, detail: string | RegExp) => ({
  gap,
  detail: typeof detail === 'string' ? detail : expect.stringMatching(detail),
});

describe('the gaps in what Ghost’s server checks', () => {
  it('names the issue that retires each gap', () => {
    for (const [name, gap] of Object.entries(GAPS)) {
      expect(gap.retiredBy.length, name).toBeGreaterThan(0);
      for (const issue of gap.retiredBy) {
        expect(issue, name).toMatch(/^BER-\d+$/);
      }
    }
  });

  it('maps fields only to scopes in the registry', () => {
    for (const { fieldScopes, defaultIncludes } of FIELD_GAPS) {
      for (const scope of Object.values(fieldScopes)) {
        expect(scope === null || isAppPermissionKey(scope), String(scope)).toBe(true);
      }
      // A default the map didn't name could never be sent
      for (const relation of defaultIncludes) {
        expect(scopeForField(fieldScopes, relation), relation).not.toBeUndefined();
      }
    }
  });

  it('finds the scope a field needs: its own, one for everything under it, or none', () => {
    const { fieldScopes } = SERVER_GAPS.postFields;
    expect(scopeForField(fieldScopes, 'tags')).toBe('tag:browse');
    expect(scopeForField(fieldScopes, 'Count.Clicks')).toBe('post:readStats');
    expect(scopeForField(fieldScopes, 'email.open_rate')).toBe('post:readStats');
    expect(scopeForField(fieldScopes, 'authors')).toBeNull();
    expect(scopeForField(fieldScopes, 'authors.roles')).toBeUndefined();
    expect(scopeForField(fieldScopes, 'counts')).toBeUndefined();
  });
});

describe('script in a write', () => {
  const write = (path: string, body: unknown, method: FetchMethod = 'POST') =>
    sent(path, { method, body: typeof body === 'string' ? body : JSON.stringify(body) });

  it('refuses code injection with any value, on posts, pages and tags, at any depth', () => {
    for (const kind of ['posts', 'pages', 'tags'] as const) {
      for (const field of ['codeinjection_head', 'codeinjection_foot']) {
        for (const value of ['<script></script>', '', null]) {
          expect(write(`/${kind}/`, { [kind]: [{ [field]: value }] }), `${kind} ${field}`).toEqual(
            refusedBy('scriptInContent', `Apps can't send ${field} to POST /${kind}/`),
          );
        }
      }
    }
    expect(
      write(
        `/posts/${ID}/`,
        { posts: [{ tags: [{ name: 'x', codeinjection_foot: '<script>' }] }] },
        'PUT',
      ),
    ).toEqual(
      refusedBy('scriptInContent', `Apps can't send codeinjection_foot to PUT /posts/${ID}/`),
    );
  });

  it('refuses mobiledoc unless it is null', () => {
    for (const mobiledoc of ['{"cards":[]}', {}, '']) {
      expect(write('/posts/', { posts: [{ mobiledoc }] })).toEqual(
        refusedBy('scriptInContent', "Apps can't send mobiledoc to POST /posts/"),
      );
    }
    expect(write('/posts/', { posts: [{ title: 'x', mobiledoc: null }] })).toBeTypeOf('string');
  });

  it('refuses a body that isn’t JSON, and takes a write with none', () => {
    expect(write(`/tags/${ID}/`, '{"tags":', 'PUT')).toEqual(
      refusedBy('scriptInContent', `Apps can only send JSON to PUT /tags/${ID}/`),
    );
    expect(sent('/tags/', { method: 'POST' })).toBe('');
  });

  it('leaves the rest of a post, page or tag alone, cards and HTML included', () => {
    expect(
      write('/posts/', {
        posts: [
          {
            title: '<b>Hello</b>',
            html: '<script></script>',
            lexical: JSON.stringify({
              root: { type: 'root', children: [{ type: 'html', html: '<script></script>' }] },
            }),
            feature_image_caption: 'By <a href="https://example.com/">Jo</a>',
            status: 'published',
            tags: [{ name: 'News' }],
          },
        ],
      }),
    ).toBeTypeOf('string');
    expect(write('/tags/', { tags: [{ name: 'News', description: '<b>x</b>' }] })).toBe('');
    expect(write('/tags/', '"codeinjection_head"')).toBe('');
  });
});

describe('what a post, page or newsletter comes with', () => {
  const included = (path: string, options: Sent = {}) => {
    const search = sent(path, options);
    return typeof search === 'string' ? new URLSearchParams(search).get('include') : search;
  };

  // Ghost includes how a post performed when a request names nothing, so the bridge names what
  // the app may have instead.
  it('names the includes an app may have when it names none', () => {
    expect(included('/posts/')).toBe('tags,authors,tiers,newsletter');
    expect(included(`/posts/${ID}/`)).toBe('tags,authors,tiers,newsletter');
    expect(included('/pages/?include=,')).toBe('tags,authors,tiers');
    expect(included('/posts/?include=%20')).toBe('tags,authors,tiers,newsletter');
    expect(included('/posts/?include')).toBe('tags,authors,tiers,newsletter');
    expect(included('/posts/', { approved: new Set(['post:browse']) })).toBe('authors');
    expect(included('/posts/', { approved: new Set([...APPROVED, 'post:readStats']) })).toBe(
      'tags,authors,email,tiers,newsletter,count.clicks',
    );
    expect(included('/pages/', { approved: new Set([...APPROVED, 'post:readStats']) })).toBe(
      'tags,authors,tiers,count.signups,count.paid_conversions',
    );
  });

  it('keeps the rest of the query, and puts its own include where the app’s was', () => {
    expect(sent('/posts/?limit=5&include=&filter=tag:news')).toBe(
      '?limit=5&include=tags%2Cauthors%2Ctiers%2Cnewsletter&filter=tag%3Anews',
    );
    expect(sent('/posts/?limit=5')).toBe('?limit=5&include=tags%2Cauthors%2Ctiers%2Cnewsletter');
  });

  // Ghost adds no defaults to a request that asks for some `fields`, so neither does the bridge.
  // An empty `fields` asks for nothing, so Ghost would add its defaults.
  it('names none when a request asks for some fields', () => {
    for (const fields of ['id,title', 'false', 'true', '%20']) {
      expect(included(`/posts/?fields=${fields}`), fields).toBeNull();
      expect(included(`/pages/${ID}/?fields=${fields}`), fields).toBeNull();
    }
    expect(included('/posts/?fields=')).toBe('tags,authors,tiers,newsletter');
    const body = '{"posts":[{"title":"Hi"}]}';
    // A write can't ask for fields, which Ghost honours only on a read
    expect(included('/posts/?fields=id', { method: 'POST', body })).toEqual(
      refusedBy('postWriteParameters', "Apps can't use the fields parameter on POST /posts/"),
    );
    expect(included('/posts/', { method: 'POST', body })).toBe('tags,authors,tiers,newsletter');
  });

  it('holds the search index of posts and pages to the same includes and sorts, naming none', () => {
    expect(included('/search-index/posts/')).toBeNull();
    expect(included('/search-index/pages/?include=email')).toEqual(
      refusedBy(
        'searchIndexFields',
        "This app wasn't approved for post:readStats, which including email needs",
      ),
    );
    expect(sent('/search-index/posts/?order=sentiment%20desc')).toMatchObject({
      gap: 'searchIndexFields',
    });
  });

  it('leaves an include the app named as it is, once it is allowed', () => {
    expect(included('/posts/?include=authors')).toBe('authors');
    expect(included('/posts/?include=%20Tags%20,,authors&fields=id')).toBe(' Tags ,,authors');
    expect(included('/newsletters/')).toBeNull();
    expect(included('/newsletters/?include=count.posts')).toBe('count.posts');
  });

  it('needs the related object’s scope to include it', () => {
    const only = (scope: AppPermissionKey) => ({ approved: new Set<AppPermissionKey>([scope]) });
    expect(included('/posts/?include=tags', only('post:browse'))).toEqual(
      refusedBy(
        'postFields',
        "This app wasn't approved for tag:browse, which including tags needs",
      ),
    );
    expect(included('/pages/?include=authors,tiers', only('post:browse'))).toEqual(
      refusedBy(
        'pageFields',
        "This app wasn't approved for product:browse, which including tiers needs",
      ),
    );
    expect(included(`/posts/${ID}/?include=newsletter`, only('post:read'))).toEqual(
      refusedBy(
        'postFields',
        "This app wasn't approved for newsletter:browse, which including newsletter needs",
      ),
    );
    expect(included('/posts/?include=authors,post_revisions', only('post:browse'))).toBe(
      'authors,post_revisions',
    );
  });

  it('refuses a relation apps can’t include', () => {
    expect(included('/posts/?include=authors.roles')).toEqual(
      refusedBy('postFields', "Apps can't include authors.roles on GET /posts/"),
    );
    expect(included('/pages/?include=tags,post_revisions.author')).toEqual(
      refusedBy('pageFields', "Apps can't include post_revisions.author on GET /pages/"),
    );
    // How many members subscribe is member data, which no scope grants yet
    for (const count of ['count.members', 'count.active_members', 'count.posts,count.members']) {
      expect(included(`/newsletters/?include=${count}`), count).toEqual(
        refusedBy('newsletterFields', /^Apps can't include count\.(active_)?members on GET /),
      );
    }
  });

  it('includes or sorts by how posts performed only with post:readStats', () => {
    const stats = { approved: new Set<AppPermissionKey>([...APPROVED, 'post:readStats']) };
    for (const include of [
      'email',
      'email.open_rate',
      'count.clicks',
      'COUNT.Signups',
      'sentiment',
    ]) {
      expect(included(`/posts/?include=${include}`), include).toEqual(
        refusedBy(
          'postFields',
          `This app wasn't approved for post:readStats, which including ${include} needs`,
        ),
      );
      expect(included(`/posts/?include=${include}`, stats), include).toBe(include);
    }
    for (const order of ['sentiment desc', 'title asc, count.clicks DESC', 'email.open_rate']) {
      const field = order.includes('count') ? 'count.clicks' : order.split(' ')[0];
      expect(sent(`/posts/?order=${order}`), order).toEqual(
        refusedBy(
          'postFields',
          `This app wasn't approved for post:readStats, which ordering by ${field} needs`,
        ),
      );
      expect(sent(`/posts/?order=${order}`, stats), order).toBeTypeOf('string');
    }
    // Any other field sorts freely, as Ghost decides what it can sort by
    expect(sent('/posts/?order=published_at desc,title')).toBeTypeOf('string');
    expect(sent('/pages/?order=')).toBeTypeOf('string');
  });

  it('holds a write’s include and order to the same rules', () => {
    const body = '{"posts":[{"title":"Hi"}]}';
    expect(sent('/posts/?include=sentiment', { method: 'POST', body })).toMatchObject({
      gap: 'postFields',
    });
    expect(sent(`/pages/${ID}/?include=email`, { method: 'PUT', body })).toMatchObject({
      gap: 'pageFields',
    });
  });
});
