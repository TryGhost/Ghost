import { z } from 'zod';
import { getHelpArticleSlug } from './help-article-html';
import type { HelpArticle } from './help-center';

/*
 * The DocsBot search client. A question goes to DocsBot's semantic search API
 * (https://docsbot.ai/documentation/developer/semantic-search-api), whose bot
 * is indexed on the help center (ghost.org/help). It answers with the chunks
 * of text closest in meaning to the question, each with the page it came
 * from, and the panel turns those pages into help center articles to read.
 *
 * Unlike the chat agent API, nothing is generated: there's no answer to
 * stream and no conversation to keep, only pages ranked by meaning. That's
 * the point of this prototype: a search that understands the question,
 * answered by the help center's own articles.
 */

// PROTOTYPE: a test team and bot, hardcoded and asked without a key from the
// browser. Move them into Ghost config before anyone outside the team sees it.
export const DOCSBOT_TEAM_ID = 'HQWGXatyyGbuBqc5JOuT';
export const DOCSBOT_BOT_ID = 'iUM7pu7wtd6BMYxBwpQU';
const DOCSBOT_SEARCH_URL = `https://api.docsbot.ai/teams/${DOCSBOT_TEAM_ID}/bots/${DOCSBOT_BOT_ID}/search`;

/** How many articles a search shows. */
export const MAX_RESULTS = 3;
// Chunks, not articles: an article often takes several of the top places
const TOP_K = 10;
// Long enough for a slow connection; short enough that DocsBot being down
// shows as an error rather than a search that never ends
const TIMEOUT = 15_000;

const HitSchema = z
  .looseObject({
    title: z.string().nullish(),
    url: z.string().nullish(),
    content: z.string().nullish(),
  })
  .transform((hit) => ({
    title: hit.title?.trim() || hit.url || '',
    url: hit.url ?? null,
    content: hit.content ?? '',
  }));

export type HelpSearchHit = z.output<typeof HitSchema>;

/** The chunks closest in meaning to the query, best first. */
export async function searchDocsBot(query: string, signal?: AbortSignal): Promise<HelpSearchHit[]> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT);
  signal?.addEventListener('abort', () => controller.abort());

  try {
    // eslint-disable-next-line no-restricted-syntax -- DocsBot's search API, not the Admin API
    const response = await fetch(DOCSBOT_SEARCH_URL, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: TOP_K }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`DocsBot search answered ${response.status}`);
    }
    const hits = z.array(z.unknown()).parse(await response.json());
    return hits.flatMap((hit) => {
      const parsed = HitSchema.safeParse(hit);
      return parsed.success ? [parsed.data] : [];
    });
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * The help center articles the hits came from, best first and each once, as
 * the article list knows them (for their excerpt, topic and reading in the
 * panel). Hits from pages that aren't articles in the list are left out.
 */
export function toSearchResults(hits: HelpSearchHit[], articles: HelpArticle[]): HelpArticle[] {
  const results: HelpArticle[] = [];
  for (const hit of hits) {
    const slug = hit.url ? getHelpArticleSlug(hit.url) : null;
    const article = slug ? articles.find((candidate) => candidate.slug === slug) : undefined;
    if (article && !results.some(({ id }) => id === article.id)) {
      results.push(article);
    }
    if (results.length === MAX_RESULTS) {
      break;
    }
  }
  return results;
}
