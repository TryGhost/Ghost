import type { HelpArticle } from './help-center';
import { type HelpPageKey, PAGE_QUESTIONS, PAGE_WORDS } from './help-pages';

/*
 * The help center's FAQ (ghost.org/help/topic/faq/): articles tagged `faq`,
 * most with a question for a title ("How do I cancel member subscriptions?").
 * The panel suggests them before the user searches (help-suggestions.ts) and
 * completes what the user types with them (use-help-typeahead.ts), so what's
 * offered reads as a question to search for. Both favor questions about the
 * page the user is on.
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

// Shorter than this, what's typed completes to too much to be useful
const MIN_LENGTH = 3;
const MAX_MATCHES = 4;

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

// Words that say nothing about which question is meant; only the others
// have to match, so a question keeps completing as the user types around it
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

/**
 * The FAQ questions that complete what the user has typed so far. The words
 * that carry meaning (not "how do I") each have to start a word in the
 * question, the last one usually half-typed, and more than half of them
 * must: from three words on, one that isn't in a question doesn't lose it,
 * so completions stay as the user types on. Questions about the page the user is on come first
 * (getPageRelevance), then the ones more of the words matched, then those
 * that start the way the user did, then the ones whose matching words come
 * earliest.
 */
export function matchQuestions(
  questions: HelpArticle[],
  draft: string,
  page: HelpPageKey | null = null,
): HelpArticle[] {
  const typed = wordsOf(draft);
  if (draft.trim().length < MIN_LENGTH || !typed.length) {
    return [];
  }
  const meaningful = typed.filter((word) => !STOP_WORDS.has(word));
  // "how do i" is all stop words, and should still complete
  const terms = meaningful.length ? meaningful : typed;

  const scored = questions.flatMap((question) => {
    const words = wordsOf(question.title);
    const positions = terms.map((term) => words.findIndex((word) => word.startsWith(term)));
    const matched = positions.filter((position) => position !== -1);
    // More than half: with two words both must match, with three one may miss
    if (matched.length < Math.ceil((terms.length + 1) / 2)) {
      return [];
    }
    const fromStart = typed.every((term, index) => words[index]?.startsWith(term));
    return [
      {
        question,
        relevance: getPageRelevance(question, page),
        matched: matched.length,
        fromStart,
        score: matched.reduce((sum, position) => sum + position, 0),
      },
    ];
  });
  return scored
    .sort(
      (a, b) =>
        b.relevance - a.relevance ||
        b.matched - a.matched ||
        Number(b.fromStart) - Number(a.fromStart) ||
        a.score - b.score ||
        a.question.title.length - b.question.title.length,
    )
    .slice(0, MAX_MATCHES)
    .map(({ question }) => question);
}
