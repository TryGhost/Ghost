import type { HelpArticle } from './help-center';

/*
 * The help center's FAQ (ghost.org/help/topic/faq/): articles tagged `faq`,
 * most with a question for a title ("How do I cancel member subscriptions?").
 * The panel suggests them before the user asks anything (help-suggestions.ts),
 * so what's offered reads as a question to ask DocsBot, not an article to read.
 *
 * It also spots a question that's really a request for a person, which the
 * panel answers with the support form rather than DocsBot.
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

const SUPPORT_PHRASE =
  /\b(contact|customer|human|live|real|reach|talk to|speak to|speak with|chat with|chat to|email|message|write to)\s+(the\s+|a\s+|your\s+|ghost(\(pro\))?\s+)?(support|human|person|someone|somebody|agent|staff|team|people|representative)\b/i;
const SUPPORT_WORDS =
  /\b(support ticket|open a ticket|raise a ticket|real person|real human|live agent|human support)\b/i;

/** Whether the question is really asking for a person, not an answer. */
export function wantsSupport(text: string) {
  return SUPPORT_PHRASE.test(text) || SUPPORT_WORDS.test(text);
}
