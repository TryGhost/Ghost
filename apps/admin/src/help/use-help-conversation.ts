import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { HelpArticle } from './help-center';
import { plural } from './help-format';
import {
  getPageContext,
  getSearchTerms,
  isAboutAccount,
  MAX_RESULTS,
  rankHelpArticles,
  type HelpFollowUp,
  type HelpPageContext,
} from './help-search';
import { getQuestionContext, type HelpBilling, type HelpSignals } from './help-signals';
import { getSiteCardKind, isBillingCard, type HelpSiteCardKind } from './help-site-card-kinds';
import { helpCenterIndexQuery } from './use-help-center-index';

/*
 * The conversation: questions, answers, follow-ups, reading articles and the
 * message to support, and which of them the panel shows (its view).
 *
 * There's no LLM. An answer is a search of the help center's article list
 * (help-search.ts), narrated step by step while it runs, then shown as the
 * best match's excerpt with up to three articles, and a site card where one
 * applies (help-site-card-kinds.ts).
 *
 * Each question quietly carries the one before it that found something
 * (getFollowUp), so "how do I customise it" after "how to connect Stripe"
 * stays on Stripe. It's listed in the question's context and the answer's
 * steps, not in the question itself.
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

interface HelpSearchRequest {
  query: string;
  /** The page it was asked from, unless the user left it out */
  page: HelpPageContext | null;
  /** An article picked from the suggestions, which leads the answer */
  picked: HelpArticle | null;
  /** The question before, which this one may follow up on */
  followUp: HelpFollowUp | null;
  /** Their Ghost(Pro) billing, for which site card the answer gets */
  billing: Pick<HelpBilling, 'canManage' | 'status'>;
}

export interface HelpSearchResult {
  terms: string[];
  articles: HelpArticle[];
  /** Whether the question was about the user's own Ghost(Pro) account */
  aboutAccount: boolean;
}

export interface HelpAnswer {
  type: 'answer';
  id: string;
  status: 'working' | 'done' | 'error';
  /** What it's doing while it works */
  verb: string;
  /** What it did, once each step is over */
  steps: string[];
  seconds: number;
  request: HelpSearchRequest;
  result: HelpSearchResult | null;
  // PROTOTYPE: kept in this component state only; record it (trackEvent) to
  // learn which answers work
  feedback: 'up' | 'down' | null;
}

/** Left in the thread once a message has gone to the support team. */
export interface HelpReceipt {
  type: 'receipt';
  id: string;
  ticket: string;
}

export type HelpMessage = HelpQuestion | HelpAnswer | HelpReceipt;

export interface HelpSupportDraft {
  subject: string;
  body: string;
  // PROTOTYPE: only file names are kept; a real send needs the files uploaded
  files: string[];
  status: 'draft' | 'sending' | 'sent';
  ticket: string | null;
}

const EMPTY_DRAFT: HelpSupportDraft = {
  subject: '',
  body: '',
  files: [],
  status: 'draft',
  ticket: null,
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

// PROTOTYPE, a product decision: each step is held at least this long so it
// reads as work being done; the search itself takes a few milliseconds. Keep,
// shorten or drop it.
const MIN_STEP_DURATION = 700;
// PROTOTYPE: nothing is sent; this only stands in for the request
const SEND_DURATION = 1200;

/** The question before, for a follow-up to lean on: the last one that found something. */
export function getFollowUp(messages: HelpMessage[]): HelpFollowUp | null {
  const previous = [...messages]
    .reverse()
    .find(
      (message): message is HelpAnswer =>
        message.type === 'answer' && !!message.result?.articles.length,
    );
  const top = previous?.result?.articles[0];
  if (!previous || !top) {
    return null;
  }
  return {
    query: previous.request.query,
    terms: getSearchTerms(previous.request.query),
    topic: top.tags[0]?.slug ?? null,
  };
}

/** Answers a question from the help center's article list. */
function searchHelpCenter(
  { query, page, picked, followUp }: HelpSearchRequest,
  articles: HelpArticle[],
): HelpSearchResult {
  const terms = getSearchTerms(query);
  const ranked = rankHelpArticles(articles, terms, page, followUp);
  const aboutAccount = isAboutAccount(terms);

  if (!picked) {
    return { terms, articles: ranked, aboutAccount };
  }
  const related = ranked.filter(({ id }) => id !== picked.id);
  return { terms, articles: [picked, ...related].slice(0, MAX_RESULTS), aboutAccount };
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
  // Bumped by a new conversation, so searches from the old one stop
  const generation = useRef(0);
  const nextId = useRef(0);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

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

  /** Searches for an answer, and narrates each step as it goes. */
  const run = useCallback(
    async (answerId: string, request: HelpSearchRequest) => {
      const runGeneration = generation.current;
      const current = () => generation.current === runGeneration;
      const started = Date.now();
      // Never resolves once a new conversation clears the timers, which stops
      // a search from the old one where it is
      const pause = () =>
        new Promise<void>((resolve) => {
          later(MIN_STEP_DURATION, resolve);
        });
      const steps: string[] = [];

      update<HelpAnswer>(answerId, {
        status: 'working',
        verb: 'Searching the help center',
        steps: [],
        result: null,
      });

      try {
        // The article list is loaded once, and the first search waits for it
        const [articles] = await Promise.all([
          queryClient.fetchQuery(helpCenterIndexQuery),
          pause(),
        ]);
        if (!current()) {
          return;
        }
        const result = searchHelpCenter(request, articles);
        const terms = result.terms.length ? ` for “${result.terms.join(' ')}”` : '';
        steps.push(`Searched the help center${terms}`);
        if (result.aboutAccount) {
          steps.push('Looked through Ghost(Pro) account articles, as it sounds like yours');
        }
        if (request.followUp) {
          steps.push(`Kept your last question in mind: “${request.followUp.query}”`);
        }

        const found = result.articles.length;
        if (found) {
          update<HelpAnswer>(answerId, {
            verb: `Reading ${plural(found, 'article')}`,
            steps: [...steps],
          });
          await pause();
          steps.push(`Read ${plural(found, 'matching article')}`);
        } else {
          steps.push('Found no matching articles');
        }

        const [top] = result.articles;
        const siteCard = top && getSiteCardKind(top.slug, request.billing);
        // Billing is only checked once the billing app has reported it
        if (siteCard && (!isBillingCard(siteCard) || request.billing.status)) {
          update<HelpAnswer>(answerId, { verb: 'Checking your site', steps: [...steps] });
          await pause();
          steps.push(SITE_CARD_STEPS[siteCard]);
        }

        update<HelpAnswer>(answerId, {
          status: 'done',
          steps,
          result,
          seconds: Math.max(1, Math.round((Date.now() - started) / 1000)),
        });
      } catch {
        // The article list couldn't be loaded (help-center.ts gives up after a timeout)
        if (current()) {
          update<HelpAnswer>(answerId, { status: 'error', steps: [] });
        }
      }
    },
    [later, queryClient, update],
  );

  const followUp = useMemo(() => getFollowUp(messages), [messages]);

  const ask = useCallback(
    (text: string, withPage: boolean, picked: HelpArticle | null = null) => {
      const request = {
        query: text,
        page: withPage ? getPageContext(signals.pageKey) : null,
        picked,
        followUp,
        billing: { canManage: signals.billing.canManage, status: signals.billing.status },
      };
      const answerId = createId();

      setMessages((current) => [
        ...current,
        {
          type: 'question',
          id: createId(),
          text,
          pageLabel: withPage ? signals.pageLabel : null,
          context: [
            ...getQuestionContext(signals, withPage),
            ...(followUp ? [`Following up on: “${followUp.query}”`] : []),
          ],
        },
        {
          type: 'answer',
          id: answerId,
          status: 'working',
          verb: 'Searching the help center',
          steps: [],
          seconds: 0,
          request,
          result: null,
          feedback: null,
        },
      ]);
      void run(answerId, request);
    },
    [followUp, run, signals],
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

  /** Opens the message to support, its subject the last question if it has none yet. */
  const contactSupport = useCallback(() => {
    setSupport((current) =>
      current.subject ? current : { ...current, subject: lastQuestion?.text ?? '' },
    );
    setView('support');
  }, [lastQuestion]);

  const editSupport = useCallback(
    (patch: Partial<Pick<HelpSupportDraft, 'subject' | 'body' | 'files'>>) =>
      setSupport((current) => ({ ...current, ...patch })),
    [],
  );

  // PROTOTYPE: nothing is sent and the reference is made up. Ghost(Pro)
  // support is email today: the quickest real version opens a
  // mailto:support@ghost.org draft with the subject, message and context
  // (getSupportContext in help-signals.ts).
  const sendToSupport = useCallback(() => {
    setSupport((current) => ({ ...current, status: 'sending' }));
    later(SEND_DURATION, () =>
      setSupport((current) => ({
        ...current,
        status: 'sent',
        ticket: `#${48000 + Math.floor(Math.random() * 1000)}`,
      })),
    );
  }, [later]);

  /** Back to the conversation; once sent, the message leaves a receipt there. */
  const leaveSupport = useCallback(() => {
    const { status, ticket } = support;
    if (status === 'sent' && ticket) {
      setMessages((current) => [...current, { type: 'receipt', id: createId(), ticket }]);
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
    generation.current += 1;
    clearTimers();
    setMessages([]);
    setOpenedArticles([]);
    setSupport(EMPTY_DRAFT);
    setReading(null);
    setView('conversation');
  }, [clearTimers]);

  const working = messages.some(
    (message) => message.type === 'answer' && message.status === 'working',
  );

  return {
    messages,
    openedArticles,
    working,
    view,
    reading,
    support,
    lastQuestion,
    /** The question a new one would follow up on, for matches as the user types too */
    followUp,
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
