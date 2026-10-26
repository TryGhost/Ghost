import type { HelpArticle } from './help-center';
import { PAGE_TOPICS, type HelpPageKey } from './help-pages';

/*
 * How the Help panel answers a question: keyword search over the help
 * center's article list, ranked in the browser (pure functions, covered by
 * help-search.test.ts). There's no LLM: answers are the help center's own
 * words, nothing the user types leaves the browser, and results are
 * predictable. Used for questions (use-help-conversation.ts) and for matches
 * as the user types (use-help-typeahead.ts).
 *
 *   1. getSearchTerms: the question's words, without stop words.
 *   2. getTermGroups: each word's forms (its -ize spelling, SYNONYMS), and
 *      each pair of words joined ("go daddy" → godaddy).
 *   3. rankHelpArticles: each word scores where it appears in each article
 *      (title, topic, the opening of its text), then lifts for articles about
 *      the user's page, their own account (isAboutAccount) and the question
 *      before; the best three are kept.
 *
 * The weights were tuned by hand against a few dozen real questions on the
 * live help center (see README.md), not against data. Measuring what people
 * ask and open is how they should be tuned for production.
 */

// Where a word matches in an article, best first
const TITLE_SCORE = 3;
const TOPIC_SCORE = 2;
const TEXT_SCORE = 1;
// Lifts for articles that already match the question
const PAGE_LIFT = 1;
// Account questions lean hard on the account's topic: its articles rarely use
// the words people ask with ("turn off auto-renew" for "cancel")
const ACCOUNT_LIFT = 2;
const FOLLOW_UP_WORD_LIFT = 1;
const FOLLOW_UP_TOPIC_LIFT = 1;
// Only results nearly as good as the best, so a word in common isn't enough
const RELATIVE_CUTOFF = 0.5;

/** The most articles an answer, or the matches as the user types, show. */
export const MAX_RESULTS = 3;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'be',
  'been',
  'can',
  'cant',
  'did',
  'didnt',
  'do',
  'does',
  'doesnt',
  'dont',
  'for',
  'from',
  'get',
  'has',
  'hasnt',
  'have',
  'how',
  'i',
  'in',
  'is',
  'isnt',
  'it',
  'its',
  'me',
  'my',
  'not',
  'of',
  'on',
  'or',
  'should',
  'so',
  'the',
  'this',
  'to',
  'up',
  'was',
  'what',
  'when',
  'where',
  'why',
  'will',
  'with',
  'wont',
  'you',
  'your',
  // Filler that would otherwise match titles ("Transfer site ownership to another user")
  'about',
  'another',
  'any',
  'could',
  'need',
  'other',
  'please',
  'want',
  'would',
]);

function wordsOf(text: string) {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** The words a question is about: everything but stop words. */
export function getSearchTerms(query: string) {
  return [...new Set(wordsOf(query).filter((word) => !STOP_WORDS.has(word)))];
}

// Shorter words ("go", "ai") match too much to search on alone; they're only
// dropped after being tried joined to the next word
const MIN_TERM = 3;

// "customizing", "customized" and "customize" all become "customiz", so a
// contains-match on it finds each
function stem(word: string) {
  if (word.length <= 4) {
    return word;
  }
  const stemmed = word.replace(/(ing|ed|s)$/, '');
  return stemmed.length > 4 ? stemmed.replace(/e$/, '') : stemmed;
}

// Long enough to match inside a word without matching by accident ("sign" is
// in "design")
const MIN_INNER_MATCH = 5;

/**
 * "scheduled" finds "scheduling", "emails" finds "email", "custom" finds
 * "customize" and "daddy" finds "godaddy". A shorter word in an article only
 * counts when it's nearly the whole term, so "custom" doesn't answer
 * "customise".
 */
function termMatches(term: string, word: string) {
  const a = stem(term);
  const b = stem(word);
  if (a === b) {
    return true;
  }
  if (a.length >= MIN_INNER_MATCH && b.includes(a)) {
    return true;
  }
  if (a.length < 4 || b.length < 4) {
    return false;
  }
  return b.startsWith(a) || (a.startsWith(b) && b.length >= a.length - 1);
}

// The help center's words for what people ask in their own: cancelling a
// Ghost(Pro) plan is turning off auto-renew. A small, hand-kept list: words
// the help center should arguably use itself (in a custom excerpt)
const SYNONYMS: Array<[word: string, alternatives: string[]]> = [
  ['cancel', ['renew']],
  ['downgrade', ['plan']],
  ['upgrade', ['plan']],
];

// British -ise spellings, as the help center writes -ize ("Customizing Stripe")
const BRITISH_ISE = /is(e|es|ed|ing|ation|ations)$/;

/**
 * What to match each of a question's words on, one group per word so its
 * alternatives count once: the word, its -ize spelling, and the help center's
 * word for it. Each pair of words is also tried joined, for names people
 * split ("go daddy" finds GoDaddy).
 */
function getTermGroups(words: string[]): string[][] {
  const groups = words.map((word) => [
    word,
    ...(BRITISH_ISE.test(word) ? [word.replace(BRITISH_ISE, 'iz$1')] : []),
    ...SYNONYMS.flatMap(([synonym, alternatives]) =>
      termMatches(synonym, word) ? alternatives : [],
    ),
  ]);
  const joined = words.slice(1).map((word, index) => [`${words[index]}${word}`]);

  return [...groups, ...joined]
    .map((group) => [...new Set(group)].filter((term) => term.length >= MIN_TERM))
    .filter((group) => group.length > 0);
}

// What people ask about their own Ghost(Pro) account with, cancelling, pausing
// and changing plans being among the commonest reasons to contact support
const ACCOUNT_WORDS = [
  'account',
  'billing',
  'cancel',
  'charge',
  'delete',
  'downgrade',
  'invoice',
  'pause',
  'plan',
  'price',
  'pricing',
  'refund',
  'renew',
  'subscription',
  'trial',
  'upgrade',
];
// …unless it's about their members' accounts, or what they sell them
const MEMBER_WORDS = ['member', 'reader', 'subscriber', 'customer', 'tier', 'offer'];

/** The help center topic of the user's own Ghost(Pro) account. */
export const ACCOUNT_TOPIC = 'ghost-pro';

const mentionsAny = (terms: string[], list: string[]) =>
  terms.some((term) => list.some((word) => termMatches(word, term)));

/**
 * Whether a question is about the user's own Ghost(Pro) account ("how do I
 * cancel my account"), not their members' ("cancel a member's subscription").
 */
export function isAboutAccount(terms: string[]) {
  return mentionsAny(terms, ACCOUNT_WORDS) && !mentionsAny(terms, MEMBER_WORDS);
}

/**
 * The question before this one, which a follow-up like "how do I customize
 * it?" leans on.
 */
export interface HelpFollowUp {
  query: string;
  terms: string[];
  /** Its best match's main topic */
  topic: string | null;
}

/** The page a question was asked from, for lifting the articles about it. */
export interface HelpPageContext {
  key: HelpPageKey;
  topics: string[];
}

export function getPageContext(page: HelpPageKey): HelpPageContext {
  return { key: page, topics: PAGE_TOPICS[page] };
}

interface ArticleWords {
  title: string[];
  topics: string[];
  text: string[];
}

// Each article's words, worked out once per loaded article rather than on
// every keystroke of the matches as the user types
const articleWordsCache = new WeakMap<HelpArticle, ArticleWords>();

function getArticleWords(article: HelpArticle): ArticleWords {
  let words = articleWordsCache.get(article);
  if (!words) {
    words = {
      title: wordsOf(article.title),
      topics: article.tags.flatMap(({ name }) => wordsOf(name)),
      text: wordsOf(article.searchText),
    };
    articleWordsCache.set(article, words);
  }
  return words;
}

/**
 * Orders the help center's articles by where the question's words appear,
 * lifting those about the user's page (tagged for it, or with its topic as
 * their main one), about their own account when the question is, and about
 * the question before. Lifts only apply to articles that already match.
 */
export function rankHelpArticles(
  articles: HelpArticle[],
  terms: string[],
  page: HelpPageContext | null,
  followUp: HelpFollowUp | null = null,
): HelpArticle[] {
  const groups = getTermGroups(terms);
  const matchTerms = groups.flat();
  const earlierTerms = followUp
    ? getTermGroups(followUp.terms)
        .flat()
        .filter((term) => !matchTerms.includes(term))
    : [];
  const aboutAccount = isAboutAccount(terms);
  // The groups for account words: the account lift needs one of them to match
  // the article, not just any word ("change my plan" isn't about passwords)
  const accountGroups = groups.map((group) => mentionsAny(group.slice(0, 1), ACCOUNT_WORDS));

  const scored = articles.map((article) => {
    const words = getArticleWords(article);
    const scoreOf = (term: string) => {
      if (words.title.some((word) => termMatches(term, word))) {
        return TITLE_SCORE;
      }
      if (words.topics.some((word) => termMatches(term, word))) {
        return TOPIC_SCORE;
      }
      return words.text.some((word) => termMatches(term, word)) ? TEXT_SCORE : 0;
    };

    // Each word scores once, however many ways it matches
    let score = 0;
    let accountWordMatched = false;
    groups.forEach((group, index) => {
      const groupScore = Math.max(...group.map(scoreOf));
      score += groupScore;
      accountWordMatched ||= groupScore > 0 && accountGroups[index] === true;
    });
    if (score === 0) {
      return { article, score };
    }

    // Its main topic only, as an article's first tag is
    const [primaryTag] = article.tags;
    const aboutPage =
      page &&
      (article.adminKeys.includes(page.key) ||
        (primaryTag !== undefined && page.topics.includes(primaryTag.slug)));
    if (aboutPage) {
      score += PAGE_LIFT;
    }

    if (aboutAccount && accountWordMatched && primaryTag?.slug === ACCOUNT_TOPIC) {
      score += ACCOUNT_LIFT;
    }

    // The question before only reorders what this one found: an article must
    // match this question to count, so changing the subject drops the last one
    if (followUp) {
      const named = [...words.title, ...words.topics];
      if (earlierTerms.some((term) => named.some((word) => termMatches(term, word)))) {
        score += FOLLOW_UP_WORD_LIFT;
      }
      if (followUp.topic && primaryTag?.slug === followUp.topic) {
        score += FOLLOW_UP_TOPIC_LIFT;
      }
    }

    return { article, score };
  });

  const best = Math.max(0, ...scored.map(({ score }) => score));

  return scored
    .filter(({ score }) => score > 0 && score >= best * RELATIVE_CUTOFF)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map(({ article }) => article);
}
