import type { HelpArticle } from './help-center';
import { type HelpPageKey, PAGE_QUESTIONS, PAGE_WORDS } from './help-pages';

/*
 * The help center's FAQ (ghost.org/help/topic/faq/): articles tagged `faq`,
 * most with a question for a title ("How do I cancel member subscriptions?").
 * The support form offers them before anything's written (help-suggestions.ts,
 * favoring the page the user is on) and, as the user writes, nudges the FAQ
 * answers among DocsBot's results forward (nudgeFaqForward), so they can read
 * the answer instead of sending the question.
 */

/** The FAQ topic's tag slug in the help center. */
export const FAQ_TOPIC = 'faq';

// A few FAQ titles are topics ("Modifying robots.txt"); these read as questions
const QUESTION_START =
  /^(how|what|why|where|when|which|who|can|could|does|do|is|are|my|should|will|has)\b/i;

/** Whether a title reads as a question. */
export function isQuestion(title: string) {
  const trimmed = title.trim();
  return trimmed.endsWith('?') || QUESTION_START.test(trimmed);
}

/** Whether an article is in the FAQ. */
export function isFaqArticle({ tags }: HelpArticle) {
  return tags.some(({ slug }) => slug === FAQ_TOPIC);
}

/** The FAQ's questions, as articles: tagged faq, with a question for a title. */
export function getFaqQuestions(articles: HelpArticle[]) {
  return articles.filter((article) => isFaqArticle(article) && isQuestion(article.title));
}

function wordsOf(text: string) {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Whether a title has the phrase, at the start of a word ("member" covers "members"). */
function titleHas(title: string, phrase: string) {
  const words = wordsOf(title).join(' ');
  const needle = wordsOf(phrase).join(' ');
  return needle !== '' && (words.startsWith(needle) || words.includes(` ${needle}`));
}

/**
 * How much a question is about the page the user is on: 2 for the page's own
 * questions (tagged #admin-<page>, or its PAGE_QUESTIONS fallback), 1 for a
 * title with one of the page's words (PAGE_WORDS), 0 otherwise.
 */
export function getPageRelevance(question: HelpArticle, page: HelpPageKey | null) {
  if (!page) {
    return 0;
  }
  if (question.adminKeys.includes(page) || PAGE_QUESTIONS[page].includes(question.slug)) {
    return 2;
  }
  return PAGE_WORDS[page].some((word) => titleHas(question.title, word)) ? 1 : 0;
}

// How far forward an FAQ answer moves among DocsBot's results: past one
// article, not two, so relevance still decides between clear winners
const FAQ_NUDGE = 1.5;

/**
 * DocsBot's results with the FAQ answers nudged forward: each moves ahead
 * of the one article above it, since the FAQ is written to answer exactly
 * these questions, but no further, so a clearly better article still leads.
 */
export function nudgeFaqForward(articles: HelpArticle[]): HelpArticle[] {
  return articles
    .map((article, index) => ({ article, rank: index - (isFaqArticle(article) ? FAQ_NUDGE : 0) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ article }) => article);
}
