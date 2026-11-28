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

describe('re-rendering a post or converting it to Lexical', () => {
  it('refuses the two parameters on a post or page write', () => {
    for (const [method, path, parameter] of [
      ['PUT', `/posts/${ID}/?force_rerender=true`, 'force_rerender'],
      ['PUT', `/pages/${ID}/?convert_to_lexical=true`, 'convert_to_lexical'],
      ['POST', '/posts/?convert_to_lexical=true', 'convert_to_lexical'],
      ['POST', '/pages/?force_rerender', 'force_rerender'],
    ] as const) {
      const pathname = path.split('?')[0];
      expect(sent(path, { method }), `${method} ${path}`).toEqual(
        refusedBy(
          'rerenderOrConvert',
          `Apps can't use the ${parameter} parameter on ${method} ${pathname}`,
        ),
      );
    }
  });
});

describe('emailing a post or writing HTML as its content', () => {
  it('refuses the three parameters on a post or page write', () => {
    for (const [method, path, parameter] of [
      ['PUT', `/posts/${ID}/?newsletter=weekly`, 'newsletter'],
      ['PUT', `/posts/${ID}/?formats=lexical&email_segment=all`, 'email_segment'],
      ['PUT', `/pages/${ID}/?email_segment=status:free`, 'email_segment'],
      ['POST', '/posts/?source=html', 'source'],
      ['POST', '/pages/?source=html', 'source'],
      ['PUT', `/posts/${ID}/?source=html`, 'source'],
      ['PUT', `/posts/${ID}/?newsletter`, 'newsletter'],
      ['PUT', '/posts/not-an-object-id/?newsletter=weekly', 'newsletter'],
    ] as const) {
      const pathname = path.split('?')[0];
      expect(sent(path, { method }), `${method} ${path}`).toEqual(
        refusedBy(
          'emailAndHtmlSource',
          `Apps can't use the ${parameter} parameter on ${method} ${pathname}`,
        ),
      );
    }
  });

  // Another spelling of one of them never reaches this gap: the bridge refuses the query
  it('is never walked past by another spelling of a parameter', () => {
    for (const query of [
      'news%6cetter=weekly',
      '[newsletter]=weekly',
      '%5Bnewsletter%5D=weekly',
      'newsletter[]=weekly',
      'newsletter%5Ba%5D=weekly',
      'x=1&newsletter=&newsletter=weekly',
    ]) {
      expect(sent(`/posts/${ID}/?${query}`, { method: 'PUT' }), query).toMatchObject({
        detail: expect.stringMatching(/^Apps can't send /),
      });
    }
  });

  // The server reads what it knows and ignores the rest, so the bridge passes them on.
  it('sends on every other parameter, and those three anywhere but a post or page write', () => {
    for (const [method, path] of [
      ['PUT', `/posts/${ID}/?formats=lexical&include=tags&save_revision=true`],
      ['PUT', `/posts/${ID}/?anything=else`],
      ['PUT', `/posts/${ID}/?NEWSLETTER=weekly`],
      ['PUT', `/tags/${ID}/?include=count.posts&formats=lexical&source=html`],
      ['GET', '/posts/?newsletter=weekly'],
      ['DELETE', `/posts/${ID}/?newsletter=weekly`],
    ] as const) {
      expect(sent(path, { method }), `${method} ${path}`).toBeTypeOf('string');
    }
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

describe('bulk edit and copying', () => {
  it('refuses bulk edit of posts and pages, until the server checks each action', () => {
    for (const path of ['/posts/bulk/', '/pages/bulk/', '/posts/BULK', '/Pages/Bulk/?filter=x']) {
      expect(sent(path, { method: 'PUT', body: '{"bulk":{"action":"feature"}}' }), path).toEqual(
        refusedBy('bulkEdit', /^Apps can't use PUT /),
      );
    }
  });

  it('refuses a copy of a post or page, until the server asks for read access to it', () => {
    for (const path of [`/posts/${ID}/copy/`, `/pages/${ID}/copy`, `/Posts/${ID}/COPY/?a=b`]) {
      expect(sent(path, { method: 'POST' }), path).toEqual(
        refusedBy('copy', /^Apps can't use POST /),
      );
    }
    expect(sent(`/posts/${ID}/copy/`)).toBe('');
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

  // Ghost answers a request for some `fields` with no defaults of its own, but only a read, and
  // only when it reads `fields` as a list. The bridge doesn't copy that: it always names them.
  it('names them whatever fields a request asks for, on a read and on a write', () => {
    for (const fields of ['id,title', '', 'false', 'true', '%20']) {
      expect(included(`/posts/?fields=${fields}`), fields).toBe('tags,authors,tiers,newsletter');
      expect(included(`/pages/${ID}/?fields=${fields}`), fields).toBe('tags,authors,tiers');
    }
    const body = '{"posts":[{"title":"Hi"}]}';
    expect(included('/posts/?fields=id', { method: 'POST', body })).toBe(
      'tags,authors,tiers,newsletter',
    );
    expect(included(`/pages/${ID}/?fields=id`, { method: 'PUT', body })).toBe('tags,authors,tiers');
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
