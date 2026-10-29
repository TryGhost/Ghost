import type { HelpArticle } from './help-center';
import { type HelpPageKey, PAGE_QUESTIONS, PAGE_WORDS } from './help-pages';

/*
 * The help center's FAQ (ghost.org/help/topic/faq/): articles tagged `faq`,
 * most with a question for a title ("How do I cancel member subscriptions?").
 * The support form offers them before anything's written (help-suggestions.ts)
 * and, as the user writes, the ones related to their words
 * (findRelatedQuestions), so they can read the answer instead of sending the
 * question. Both favor questions about the page the user is on.
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

/** The FAQ's questions, as articles: tagged faq, with a question for a title. */
export function getFaqQuestions(articles: HelpArticle[]) {
  return articles.filter(
    ({ tags, title }) => tags.some(({ slug }) => slug === FAQ_TOPIC) && isQuestion(title),
  );
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

// Words that say nothing about which question is meant: only the others
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
]);

// Shorter than this, a word says little about which question is meant
const MIN_TERM_LENGTH = 3;
const MAX_RELATED = 4;
// From this many words that carry meaning, one shared word isn't enough:
// every message mentioning members would relate to half the FAQ
const LONG_MESSAGE_TERMS = 4;

/** A word without its ending, roughly: members and member, paused and pause. */
function stem(word: string) {
  return word.replace(/(ing|ed|es|s)$/, (ending, offset: number) => (offset >= 4 ? '' : ending));
}

/** Whether two stems are the same word, allowing for an ending the stem missed. */
function sameWord(a: string, b: string) {
  return a.startsWith(b) ? b.length >= MIN_TERM_LENGTH : b.startsWith(a) && a.length >= 4;
}

/**
 * The FAQ questions related to what the user is writing, most related first:
 * the ones sharing the most words that carry meaning (not "how do I", and
 * "members" finds "member"), then the ones about the page the user is on
 * (getPageRelevance), then the shorter. A short message relates by one shared
 * word; a longer one needs two.
 */
export function findRelatedQuestions(
  questions: HelpArticle[],
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

  const scored = questions.flatMap((question) => {
    const words = wordsOf(question.title).map(stem);
    const matched = terms.filter((term) => words.some((word) => sameWord(word, term))).length;
    if (matched < needed) {
      return [];
    }
    return [{ question, matched, relevance: getPageRelevance(question, page) }];
  });
  return scored
    .sort(
      (a, b) =>
        b.matched - a.matched ||
        b.relevance - a.relevance ||
        a.question.title.length - b.question.title.length,
    )
    .slice(0, MAX_RELATED)
    .map(({ question }) => question);
}
