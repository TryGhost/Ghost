import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getHelpArticleSlug } from './help-article-html';
import type { HelpArticle } from './help-center';
import { askDocsBot, type DocsBotSource, newConversationId } from './help-docsbot';
import { plural } from './help-format';
import { extractHelpLinks, trimOpenLink } from './help-markdown';
import { wantsSupport } from './help-questions';
import { MAX_RESULTS } from './help-search';
import { getQuestionContext, type HelpBilling, type HelpSignals } from './help-signals';
import { getSiteCardKind, isBillingCard, type HelpSiteCardKind } from './help-site-card-kinds';
import { helpCenterIndexQuery } from './use-help-center-index';

/*
 * The conversation: questions, answers, follow-ups, reading articles and the
 * message to support, and which of them the panel shows (its view).
 *
 * Answers come from DocsBot (help-docsbot.ts), an agent trained on the help
 * center. Its answer streams into the thread as it's written, narrated by the
 * searches it runs, and the help center pages it drew on are matched back to
 * the article list (help-center.ts) so they open in the panel and pick a site
 * card where one applies (help-site-card-kinds.ts).
 *
 * DocsBot keeps the thread by conversation id, so a follow-up ("how do I
 * customise it" after "how to connect Stripe") needs nothing from Admin; a new
 * conversation gets a new id. A question that asks for a person (wantsSupport)
 * skips DocsBot and offers the support form instead.
 */

export interface HelpQuestion {
  type: 'question';
  id: string;
  text: string;
  /** The label of the page it was asked from, or null if the user left it out */
  pageLabel: string | null;
  /** What the panel had to go on, shown behind the question's chevron */
  context: string[];
}

interface HelpAskRequest {
  query: string;
  /** The page it was asked from, unless the user left it out */
  pageLabel: string | null;
  /** An article picked from the suggestions, which leads the answer's sources */
  picked: HelpArticle | null;
  /** Their Ghost(Pro) billing, for which site card the answer gets */
  billing: Pick<HelpBilling, 'canManage' | 'status'>;
}

/** A page DocsBot drew on that isn't in the help center's article list, so it links out. */
export interface HelpAnswerSource {
  title: string;
  url: string;
}

export interface HelpAnswerResult {
  /** The help center articles the answer drew on, to read in the panel */
  articles: HelpArticle[];
  /** Pages it drew on beyond those */
  sources: HelpAnswerSource[];
  /** Whether DocsBot found an answer in the help center */
  couldAnswer: boolean;
  /** DocsBot's id for the answer, for rating it through its API later */
  docsbotId: string | null;
  /** The user asked for a person, so there's no answer, only the way to one */
  supportRequested: boolean;
}

export interface HelpAnswer {
  type: 'answer';
  id: string;
  /** Working: nothing to show yet. Streaming: the text is still arriving. */
  status: 'working' | 'streaming' | 'done' | 'error';
  /** What it's doing while it works */
  verb: string;
  /** What it did, once each step is over */
  steps: string[];
  seconds: number;
  /** The answer, as Markdown, growing while it streams */
  text: string;
  request: HelpAskRequest;
  result: HelpAnswerResult | null;
  // PROTOTYPE: kept in this component state only; record it (trackEvent, or
  // DocsBot's rating API with result.docsbotId) to learn which answers work
  feedback: 'up' | 'down' | null;
}

/** Left in the thread once a message has gone to the support team. */
export interface HelpReceipt {
  type: 'receipt';
  id: string;
}

export type HelpMessage = HelpQuestion | HelpAnswer | HelpReceipt;

export interface HelpSupportDraft {
  subject: string;
  body: string;
  // PROTOTYPE: only file names are kept; a real send needs the files uploaded
  files: string[];
  /** Whether the conversation (questions, answers, articles read) goes with the message */
  attachConversation: boolean;
  status: 'draft' | 'sending' | 'sent';
}

const EMPTY_DRAFT: HelpSupportDraft = {
  subject: '',
  body: '',
  files: [],
  attachConversation: true,
  status: 'draft',
};

// What each site card adds to the answer's steps. PROTOTYPE: the scheduled
// posts, domain and newsletter cards show sample data (help-signals.ts), and
// say so.
const SITE_CARD_STEPS: Record<HelpSiteCardKind, string> = {
  schedule: 'Showed your scheduled posts (sample data)',
  domain: 'Showed your site’s domain (sample data)',
  subscription: 'Checked your Ghost(Pro) subscription',
  payment: 'Checked your Ghost(Pro) payments',
  newsletter: 'Showed your newsletter (sample data)',
};

// PROTOTYPE: nothing is sent; this only stands in for the request
const SEND_DURATION = 1200;

/**
 * The pages an answer drew on, matched back to the help center's article list
 * where they are help articles, so they open in the panel: the articles the
 * answer itself linked to first (they're taken out of its text, to show once),
 * then DocsBot's sources. A picked suggestion leads.
 */
export function matchSources(
  linked: string[],
  sources: DocsBotSource[],
  articles: HelpArticle[],
  picked: HelpArticle | null,
): Pick<HelpAnswerResult, 'articles' | 'sources'> {
  const matched: HelpArticle[] = picked ? [picked] : [];
  const unmatched: HelpAnswerSource[] = [];
  // The pages the answer actually used first; DocsBot often lists a page twice
  const ordered = [
    ...linked.map((url) => ({ title: url, url, used: true })),
    ...[...sources].sort((a, b) => Number(b.used) - Number(a.used)),
  ];
  for (const source of ordered) {
    if (!source.url) {
      continue;
    }
    const slug = getHelpArticleSlug(source.url);
    const article = slug ? articles.find((candidate) => candidate.slug === slug) : undefined;
    if (article) {
      if (!matched.some(({ id }) => id === article.id)) {
        matched.push(article);
      }
    } else if (!unmatched.some(({ url }) => url === source.url)) {
      unmatched.push({ title: source.title, url: source.url });
    }
  }
  return { articles: matched.slice(0, MAX_RESULTS), sources: unmatched.slice(0, MAX_RESULTS) };
}

// PROTOTYPE: DocsBot has no field for context, so the page goes in the
// question itself, as a hint it's asked not to repeat; it isn't shown in the
// thread. A picked FAQ question is complete as it is, so it goes alone. Decide
// whether the role and Ghost(Pro) state should go too.
function withPageContext(query: string, pageLabel: string | null, picked: HelpArticle | null) {
  if (!pageLabel || picked) {
    return query;
  }
  return `${query}\n\n(Context only, don't mention it: asked from the ${pageLabel} page of Ghost Admin.)`;
}

export function useHelpConversation(signals: HelpSignals) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [openedArticles, setOpenedArticles] = useState<HelpArticle[]>([]);
  // Kept while the user goes back to the conversation, so nothing they typed is lost
  const [support, setSupport] = useState<HelpSupportDraft>(EMPTY_DRAFT);
  const [view, setView] = useState<'conversation' | 'support' | 'article'>('conversation');
  // The article being read in the panel, while the view is 'article'
  const [reading, setReading] = useState<HelpArticle | null>(null);
  const timers = useRef<number[]>([]);
  // The thread DocsBot keeps; a new conversation starts a new one
  const conversationId = useRef(newConversationId());
  // The answers on their way, stopped by a new conversation
  const requests = useRef(new Set<AbortController>());
  const nextId = useRef(0);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const stopRequests = useCallback(() => {
    requests.current.forEach((controller) => controller.abort());
    requests.current.clear();
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      stopRequests();
    },
    [clearTimers, stopRequests],
  );

  const later = useCallback((delay: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, delay));
  }, []);

  const update = useCallback(<T extends HelpMessage>(id: string, patch: Partial<T>) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, ...patch } : message)),
    );
  }, []);

  const createId = () => {
    nextId.current += 1;
    return `help-${nextId.current}`;
  };

  /** Asks DocsBot, and narrates each step as the answer streams in. */
  const run = useCallback(
    async (answerId: string, request: HelpAskRequest) => {
      const controller = new AbortController();
      requests.current.add(controller);
      const current = () => !controller.signal.aborted;
      const started = Date.now();
      const steps: string[] = [];
      // As it arrives; what's shown has the help article links taken out
      let raw = '';
      let text: string | undefined;

      update<HelpAnswer>(answerId, {
        status: 'working',
        verb: 'Thinking',
        steps: [],
        text: '',
        result: null,
      });

      try {
        // The article list, to match the answer's sources to; without it they link out
        const articles = queryClient
          .fetchQuery(helpCenterIndexQuery)
          .catch((): HelpArticle[] => []);
        let result: HelpAnswerResult | null = null;

        for await (const event of askDocsBot(
          {
            conversationId: conversationId.current,
            question: withPageContext(request.query, request.pageLabel, request.picked),
            referrer: `ghost-admin/${request.pageLabel ?? 'general'}`,
          },
          controller.signal,
        )) {
          if (!current()) {
            return;
          }
          if (event.type === 'searching') {
            const queries = event.queries.map((query) => `“${query}”`).join(', ');
            steps.push(`Searched the help center${queries ? ` for ${queries}` : ''}`);
            update<HelpAnswer>(answerId, { verb: 'Searching the help center', steps: [...steps] });
          } else if (event.type === 'token') {
            raw += event.text;
            update<HelpAnswer>(answerId, {
              status: 'streaming',
              verb: 'Answering',
              text: extractHelpLinks(trimOpenLink(raw)).markdown,
            });
          } else {
            // The whole answer is authoritative over the tokens
            const { markdown, urls } = extractHelpLinks(event.answer || raw);
            text = markdown;
            const matched = matchSources(urls, event.sources, await articles, request.picked);
            result = {
              ...matched,
              couldAnswer: event.couldAnswer,
              docsbotId: event.id,
              supportRequested: false,
            };
            const found = matched.articles.length + matched.sources.length;
            steps.push(
              found ? `Read ${plural(found, 'help center page')}` : 'Found no help center pages',
            );
            if (!event.couldAnswer) {
              steps.push('Couldn’t find an answer in the help center');
            }
          }
        }
        if (!current()) {
          return;
        }
        if (!result || text === undefined) {
          // The stream ended without DocsBot's final answer
          throw new Error('DocsBot sent no answer');
        }

        const [top] = result.articles;
        const siteCard = top && getSiteCardKind(top.slug, request.billing);
        // Billing is only checked once the billing app has reported it
        if (siteCard && (!isBillingCard(siteCard) || request.billing.status)) {
          steps.push(SITE_CARD_STEPS[siteCard]);
        }

        update<HelpAnswer>(answerId, {
          status: 'done',
          steps,
          text,
          result,
          seconds: Math.max(1, Math.round((Date.now() - started) / 1000)),
        });
      } catch {
        // DocsBot couldn't be reached, or answered with an error
        if (current()) {
          update<HelpAnswer>(answerId, { status: 'error', steps: [], text: '' });
        }
      } finally {
        requests.current.delete(controller);
      }
    },
    [queryClient, update],
  );

  const ask = useCallback(
    (text: string, withPage: boolean, picked: HelpArticle | null = null) => {
      const request: HelpAskRequest = {
        query: text,
        pageLabel: withPage ? signals.pageLabel : null,
        picked,
        billing: { canManage: signals.billing.canManage, status: signals.billing.status },
      };
      const answerId = createId();
      // Asking for a person gets the way to one, not an answer from DocsBot
      const forSupport = wantsSupport(text);

      setMessages((current) => [
        ...current,
        {
          type: 'question',
          id: createId(),
          text,
          pageLabel: withPage ? signals.pageLabel : null,
          context: getQuestionContext(signals, withPage),
        },
        {
          type: 'answer',
          id: answerId,
          status: forSupport ? 'done' : 'working',
          verb: 'Thinking',
          steps: [],
          seconds: 0,
          text: '',
          request,
          result: forSupport
            ? {
                articles: [],
                sources: [],
                couldAnswer: false,
                docsbotId: null,
                supportRequested: true,
              }
            : null,
          feedback: null,
        },
      ]);
      if (!forSupport) {
        void run(answerId, request);
      }
    },
    [run, signals],
  );

  const retry = useCallback(
    (id: string) => {
      const answer = messages.find(
        (message): message is HelpAnswer => message.type === 'answer' && message.id === id,
      );
      if (answer) {
        void run(id, answer.request);
      }
    },
    [messages, run],
  );

  const rate = useCallback(
    (id: string, feedback: HelpAnswer['feedback']) => update<HelpAnswer>(id, { feedback }),
    [update],
  );

  const lastQuestion = [...messages]
    .reverse()
    .find((message): message is HelpQuestion => message.type === 'question');
  const firstQuestion = messages.find(
    (message): message is HelpQuestion => message.type === 'question',
  );

  /** Opens the message to support, started from the first question if nothing's written yet. */
  const contactSupport = useCallback(() => {
    setSupport((current) =>
      current.body ? current : { ...current, body: firstQuestion?.text ?? '' },
    );
    setView('support');
  }, [firstQuestion]);

  const editSupport = useCallback(
    (patch: Partial<Pick<HelpSupportDraft, 'subject' | 'body' | 'files' | 'attachConversation'>>) =>
      setSupport((current) => ({ ...current, ...patch })),
    [],
  );

  // PROTOTYPE: nothing is sent. Ghost(Pro) support is email today: the
  // quickest real version opens a mailto:support@ghost.org draft with the
  // message and, when attached, the conversation and context
  // (getSupportContext in help-signals.ts).
  const sendToSupport = useCallback(() => {
    setSupport((current) => ({ ...current, status: 'sending' }));
    later(SEND_DURATION, () => setSupport((current) => ({ ...current, status: 'sent' })));
  }, [later]);

  /** Back to the conversation; once sent, the message leaves a receipt there. */
  const leaveSupport = useCallback(() => {
    if (support.status === 'sent') {
      setMessages((current) => [...current, { type: 'receipt', id: createId() }]);
      setSupport(EMPTY_DRAFT);
    }
    setView('conversation');
  }, [support]);

  /** Reads an article in the panel, which counts as having read it for support. */
  const readArticle = useCallback((article: HelpArticle) => {
    setOpenedArticles((current) =>
      current.some(({ id }) => id === article.id) ? current : [...current, article],
    );
    setReading(article);
    setView('article');
  }, []);

  const leaveArticle = useCallback(() => setView('conversation'), []);

  const reset = useCallback(() => {
    stopRequests();
    clearTimers();
    conversationId.current = newConversationId();
    setMessages([]);
    setOpenedArticles([]);
    setSupport(EMPTY_DRAFT);
    setReading(null);
    setView('conversation');
  }, [clearTimers, stopRequests]);

  const working = messages.some(
    (message) =>
      message.type === 'answer' && (message.status === 'working' || message.status === 'streaming'),
  );

  return {
    messages,
    openedArticles,
    working,
    view,
    reading,
    support,
    lastQuestion,
    questionCount: messages.filter((message) => message.type === 'question').length,
    ask,
    retry,
    rate,
    contactSupport,
    editSupport,
    sendToSupport,
    leaveSupport,
    readArticle,
    leaveArticle,
    reset,
  };
}

export type HelpConversation = ReturnType<typeof useHelpConversation>;
