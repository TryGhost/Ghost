import type { HelpArticle } from './help-center';
import { type HelpPageKey, PAGE_QUESTIONS, PAGE_WORDS } from './help-pages';

/*
 * The help center's FAQ (ghost.org/help/topic/faq/): articles tagged `faq`,
 * most with a question for a title ("How do I cancel member subscriptions?").
 * The support form offers them before anything's written (help-suggestions.ts)
 * and, as the user writes, the help center articles related to their words,
 * FAQ first (findRelatedArticles), so they can read the answer instead of
 * sending the question. Both favor articles about the page the user is on.
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

// Words that say nothing about which article is meant: only the others
// are matched, so "how do I" relates to nothing and "pause" to pausing
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'this',
  'that',
  'my',
  'our',
  'your',
  'me',
  'i',
  'we',
  'you',
  'it',
  'how',
  'what',
  'why',
  'where',
  'when',
  'which',
  'who',
  'do',
  'does',
  'did',
  'is',
  'are',
  'be',
  'can',
  'could',
  'should',
  'would',
  'will',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'from',
  'at',
  'by',
  'and',
  'or',
  'not',
  'there',
  'any',
  'some',
  'please',
  'want',
  'need',
  'get',
  'set',
  'up',
  // Said in almost every help center title or excerpt, so they tell nothing apart
  'ghost',
  'pro',
  'site',
  'use',
  'using',
  'help',
  // How problems are described, rather than what they're about
  'still',
  'but',
  'also',
  'just',
  'only',
  'even',
  'now',
  'then',
  'cant',
  'dont',
  'doesnt',
  'isnt',
  'wont',
  'didnt',
  'cannot',
  'problem',
  'issue',
  'error',
  'wrong',
  'work',
  'working',
]);

// Shorter than this, a word says little about what's meant
const MIN_TERM_LENGTH = 3;
const MAX_RELATED = 4;
// From this many words that carry meaning, one shared word isn't enough:
// every message mentioning members would relate to half the help center
const LONG_MESSAGE_TERMS = 4;
// A word found only in an article's excerpt counts this much of one in its title
const EXCERPT_WEIGHT = 0.5;
// An FAQ answer comes before an article sharing as many words, even one with
// more in its excerpt, but not before one sharing a word more in its title
const FAQ_BONUS = 0.5;

/** A word without its ending, roughly: members and member, paused and pause. */
function stem(word: string) {
  return word.replace(/(ing|ed|es|s)$/, (ending, offset: number) => (offset >= 4 ? '' : ending));
}

/** Whether two stems are the same word, allowing for an ending the stem missed. */
function sameWord(a: string, b: string) {
  return a.startsWith(b) ? b.length >= MIN_TERM_LENGTH : b.startsWith(a) && a.length >= 4;
}

/**
 * The help center articles related to what the user is writing, most related
 * first: the ones sharing the most words that carry meaning (not "how do I",
 * and "members" finds "member") with their title, or at half weight their
 * excerpt. FAQ answers get a bonus, so they come before articles sharing as
 * many words, but not before one sharing a word more. Then the ones about the page
 * the user is on (getPageRelevance), then the shorter. A short message relates
 * by one shared word; a longer one needs two.
 */
export function findRelatedArticles(
  articles: HelpArticle[],
  text: string,
  page: HelpPageKey | null = null,
): HelpArticle[] {
  const terms = [
    ...new Set(
      wordsOf(text)
        .filter((word) => !STOP_WORDS.has(word) && word.length >= MIN_TERM_LENGTH)
        .map(stem),
    ),
  ];
  if (!terms.length) {
    return [];
  }
  const needed = terms.length >= LONG_MESSAGE_TERMS ? 2 : 1;

  const scored = articles.flatMap((article) => {
    const inTitle = wordsOf(article.title).map(stem);
    const inExcerpt = wordsOf(article.searchText).map(stem);
    const has = (words: string[], term: string) => words.some((word) => sameWord(word, term));
    const matched = terms.reduce((sum, term) => {
      if (has(inTitle, term)) {
        return sum + 1;
      }
      return has(inExcerpt, term) ? sum + EXCERPT_WEIGHT : sum;
    }, 0);
    if (matched < needed) {
      return [];
    }
    const faq = isFaqArticle(article);
    return [
      {
        article,
        faq,
        score: matched + (faq ? FAQ_BONUS : 0),
        relevance: getPageRelevance(article, page),
      },
    ];
  });
  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.relevance - a.relevance ||
        Number(b.faq) - Number(a.faq) ||
        a.article.title.length - b.article.title.length,
    )
    .slice(0, MAX_RELATED)
    .map(({ article }) => article);
}
