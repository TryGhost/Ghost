import { z } from 'zod';

/*
 * The help center client. The help center (ghost.org/help) is a Ghost site,
 * read through its public Content API. Admin stores no help content: titles,
 * excerpts, topics and the Admin pages an article is attached to (its
 * #admin-… internal tags) all come from here at runtime, so the docs team can
 * change any of them without an Admin release.
 *
 * Like the help center's own search, the panel loads the whole article list
 * once (about 140 articles, ~25 KB) and searches it in the browser: the
 * Content API can only filter on titles and custom excerpts, not the opening
 * of an article's text, where much of what people search for appears. An
 * article's full content loads only when it's opened in the panel.
 */

// PROTOTYPE: hardcoded. The help center's pages are served at ghost.org/help,
// but its Ghost site (and so its Content API) is help.ghost.io. Move both into
// Ghost config, so they can change without an Admin release, and keep working
// without them on older Core.
const HELP_CENTER_API_URL = 'https://help.ghost.io/help/ghost/api/content/posts/';
// PROTOTYPE: left empty in the repository. Add the help center's public
// Content API key here locally: the data-key attribute on ghost.org/help's
// pages, which its own search uses. Don't commit it. Without it, there's no
// panel and Help links to the help center as before.
const HELP_CENTER_API_KEY: string = '';

/** Whether the panel can read the help center: the key is set. */
export const hasHelpCenterKey = () => HELP_CENTER_API_KEY !== '';

export const HELP_CENTER_URL = 'https://ghost.org/help/?utm_source=admin&utm_campaign=help';

// An internal tag named `#admin-posts` gets the slug `hash-admin-posts`
const ADMIN_TAG_PREFIX = 'hash-admin-';

// Long enough for a slow connection; short enough that a help center that's
// down shows as an error rather than a search that never ends
const TIMEOUT = 10_000;

/** The caller's signal, also aborting after the timeout. */
function withTimeout(signal?: AbortSignal) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT);
  signal?.addEventListener('abort', () => controller.abort());
  controller.signal.addEventListener('abort', () => window.clearTimeout(timer));
  return controller.signal;
}

// Ghost's own excerpt is the start of the article, sometimes several
// paragraphs of it; the first reads as a summary
function getLeadParagraph(text: string) {
  return (
    text
      .trim()
      .split(/\n\s*\n/)[0]
      ?.trim() ?? ''
  );
}

const HelpArticleSchema = z
  .looseObject({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    // Rendered as links in Admin, so web addresses only
    url: z.string().url().startsWith('https://'),
    custom_excerpt: z.string().nullish(),
    excerpt: z.string().nullish(),
    featured: z.boolean().nullish(),
    updated_at: z.string().nullish(),
    tags: z
      .array(z.looseObject({ slug: z.string(), name: z.string(), visibility: z.string() }))
      .default([]),
  })
  .transform((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    url: post.url,
    // Written by the docs team for most FAQ articles; the article's opening otherwise
    excerpt: post.custom_excerpt?.trim() || getLeadParagraph(post.excerpt ?? ''),
    // What search matches beyond the title. Ghost's excerpt is the custom
    // excerpt when there is one, and otherwise the article's opening (up to
    // 500 characters); the rest of the article isn't searched.
    searchText: post.excerpt ?? '',
    // The help center's way of putting an article forward
    featured: post.featured ?? false,
    updatedAt: post.updated_at ?? '',
    // Its topics: public tags, the first being its primary topic. Internal
    // tags (#…) organize the help center and aren't topics. (Ghost itself only
    // treats the first tag as primary if it's public, so #admin-… tags go after
    // the topic tag; see README.md.)
    tags: post.tags
      .filter(({ visibility }) => visibility === 'public')
      .map(({ slug, name }) => ({ slug, name })),
    // The Admin pages and account states it's attached to, from its #admin-… tags
    adminKeys: post.tags.flatMap(({ slug }) =>
      slug.startsWith(ADMIN_TAG_PREFIX) ? [slug.slice(ADMIN_TAG_PREFIX.length)] : [],
    ),
  }));

export type HelpArticle = z.output<typeof HelpArticleSchema>;

const HelpArticlesPageSchema = z.object({
  // Each article is parsed on its own, so one malformed article is skipped
  // rather than failing the whole list
  posts: z.array(z.unknown()).default([]),
  meta: z.object({ pagination: z.object({ pages: z.number() }) }).optional(),
});

// The most the Content API returns at once
const PAGE_SIZE = 100;

/** Every article in the help center, for searching and suggesting in the browser. */
export async function fetchAllHelpArticles(signal?: AbortSignal): Promise<HelpArticle[]> {
  const articles: HelpArticle[] = [];
  let page = 1;
  let pages = 1;

  do {
    const params = new URLSearchParams({
      key: HELP_CENTER_API_KEY,
      limit: String(PAGE_SIZE),
      page: String(page),
      include: 'tags',
      fields: 'id,slug,title,url,custom_excerpt,excerpt,featured,updated_at',
    });
    // eslint-disable-next-line no-restricted-syntax -- the ghost.org help center's Content API, not the Admin API
    const response = await fetch(`${HELP_CENTER_API_URL}?${params.toString()}`, {
      credentials: 'omit',
      signal: withTimeout(signal),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch help articles: ${response.status}`);
    }

    const data = HelpArticlesPageSchema.parse(await response.json());
    for (const post of data.posts) {
      const parsed = HelpArticleSchema.safeParse(post);
      if (parsed.success) {
        articles.push(parsed.data);
      }
    }
    pages = data.meta?.pagination.pages ?? 1;
    page += 1;
  } while (page <= pages);

  return articles;
}

const HelpArticleContentSchema = z.object({
  posts: z
    .array(
      z.looseObject({
        html: z.string().nullish(),
        reading_time: z.number().nullish(),
      }),
    )
    .min(1),
});

export interface HelpArticleContent {
  /** As the help center stores it: prepare it (help-article-html.ts) before rendering */
  html: string;
  /** In minutes; 0 for very short articles */
  readingTime: number;
}

/** An article's full content, for reading it in the panel. */
export async function fetchHelpArticleContent(
  slug: string,
  signal?: AbortSignal,
): Promise<HelpArticleContent> {
  const params = new URLSearchParams({ key: HELP_CENTER_API_KEY, fields: 'html,reading_time' });

  // eslint-disable-next-line no-restricted-syntax -- the ghost.org help center's Content API, not the Admin API
  const response = await fetch(
    `${HELP_CENTER_API_URL}slug/${encodeURIComponent(slug)}/?${params.toString()}`,
    { credentials: 'omit', signal: withTimeout(signal) },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch help article ${slug}: ${response.status}`);
  }

  const [post] = HelpArticleContentSchema.parse(await response.json()).posts;
  return { html: post?.html ?? '', readingTime: post?.reading_time ?? 0 };
}
