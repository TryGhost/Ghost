import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { HelpArticle } from './help-center';
import { searchDocsBot, toSearchResults } from './help-docsbot-search';
import { helpCenterIndexQuery } from './use-help-center-index';

/*
 * The help session: the current search and its results, the article being
 * read, the message to support, and which of them the panel shows (its view).
 *
 * It's a search, not a conversation: each search stands alone and replaces
 * the last one's results, there are no follow-ups, and the user searches
 * again from the same field. A search asks DocsBot's semantic search
 * (help-docsbot-search.ts) and turns the pages it finds into articles from
 * the help center's list.
 *
 * The best article opens straight away: a picked FAQ question is an article,
 * so it opens before its search has even run, and a typed search opens its
 * first result when it lands. The other results wait under the article as
 * "More from the help center", and behind it as the results list.
 */

export interface HelpSearch {
  query: string;
  status: 'searching' | 'done' | 'error';
  results: HelpArticle[];
}

export interface HelpSupportDraft {
  subject: string;
  body: string;
  // PROTOTYPE: only file names are kept; a real send needs the files uploaded
  files: string[];
  /** Whether the searches and articles read go with the message */
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

// PROTOTYPE: nothing is sent; this only stands in for the request
const SEND_DURATION = 1200;

export function useHelpSearch() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState<HelpSearch | null>(null);
  // Every query searched for, for the support team's context
  const [searches, setSearches] = useState<string[]>([]);
  const [openedArticles, setOpenedArticles] = useState<HelpArticle[]>([]);
  // Kept while the user goes back to the search, so nothing they typed is lost
  const [support, setSupport] = useState<HelpSupportDraft>(EMPTY_DRAFT);
  const [view, setView] = useState<'search' | 'support' | 'article'>('search');
  // The article being read in the panel, while the view is 'article'
  const [reading, setReading] = useState<HelpArticle | null>(null);
  const timers = useRef<number[]>([]);
  // The search on its way, stopped by the next one
  const request = useRef<AbortController | null>(null);
  // Where the user is when a search lands, so a result only opens over the search itself
  const viewRef = useRef(view);
  viewRef.current = view;

  const stopRequest = useCallback(() => {
    request.current?.abort();
    request.current = null;
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      stopRequest();
    },
    [stopRequest],
  );

  /** Reads an article in the panel, which counts as having read it for support. */
  const readArticle = useCallback((article: HelpArticle) => {
    setOpenedArticles((current) =>
      current.some(({ id }) => id === article.id) ? current : [...current, article],
    );
    setReading(article);
    setView('article');
  }, []);

  /**
   * Searches the help center for the query, replacing the last results. With
   * nothing open already, the first result opens as soon as it lands.
   */
  const run = useCallback(
    async (query: string, opened: HelpArticle | null) => {
      stopRequest();
      const controller = new AbortController();
      request.current = controller;
      setSearch({ query, status: 'searching', results: [] });

      try {
        const [hits, articles] = await Promise.all([
          searchDocsBot(query, controller.signal),
          queryClient.fetchQuery(helpCenterIndexQuery),
        ]);
        if (controller.signal.aborted) {
          return;
        }
        const results = toSearchResults(hits, articles);
        setSearch({ query, status: 'done', results });
        const [first] = results;
        if (!opened && first && viewRef.current === 'search') {
          readArticle(first);
        }
      } catch {
        // DocsBot or the help center couldn't be reached
        if (!controller.signal.aborted) {
          setSearch({ query, status: 'error', results: [] });
        }
      } finally {
        if (request.current === controller) {
          request.current = null;
        }
      }
    },
    [queryClient, readArticle, stopRequest],
  );

  /**
   * Searches for the text. A picked FAQ question is an article already, so it
   * opens at once while its search finds more.
   */
  const searchFor = useCallback(
    (text: string, picked: HelpArticle | null = null) => {
      const query = text.trim();
      if (!query) {
        return;
      }
      setSearches((current) => [...current, query]);
      if (picked) {
        readArticle(picked);
      }
      void run(query, picked);
    },
    [readArticle, run],
  );

  const retry = useCallback(() => {
    if (search) {
      void run(search.query, null);
    }
  }, [run, search]);

  /** Opens the message to support, started from the first search if nothing's written yet. */
  const contactSupport = useCallback(() => {
    setSupport((current) => (current.body ? current : { ...current, body: searches[0] ?? '' }));
    setView('support');
  }, [searches]);

  const editSupport = useCallback(
    (patch: Partial<Pick<HelpSupportDraft, 'subject' | 'body' | 'files' | 'attachConversation'>>) =>
      setSupport((current) => ({ ...current, ...patch })),
    [],
  );

  // PROTOTYPE: nothing is sent. Ghost(Pro) support is email today: the
  // quickest real version opens a mailto:support@ghost.org draft with the
  // message and, when attached, the searches, articles read and context
  // (getSupportContext in help-signals.ts).
  const sendToSupport = useCallback(() => {
    setSupport((current) => ({ ...current, status: 'sending' }));
    timers.current.push(
      window.setTimeout(
        () => setSupport((current) => ({ ...current, status: 'sent' })),
        SEND_DURATION,
      ),
    );
  }, []);

  /** Back to the search; once sent, the draft is cleared. */
  const leaveSupport = useCallback(() => {
    if (support.status === 'sent') {
      setSupport(EMPTY_DRAFT);
    }
    setView('search');
  }, [support]);

  const leaveArticle = useCallback(() => setView('search'), []);

  /** Back to the start: no search, nothing read. */
  const reset = useCallback(() => {
    stopRequest();
    setSearch(null);
    setSearches([]);
    setOpenedArticles([]);
    setSupport(EMPTY_DRAFT);
    setReading(null);
    setView('search');
  }, [stopRequest]);

  return {
    search,
    searching: search?.status === 'searching',
    openedArticles,
    view,
    reading,
    support,
    questionCount: searches.length,
    searchFor,
    retry,
    contactSupport,
    editSupport,
    sendToSupport,
    leaveSupport,
    readArticle,
    leaveArticle,
    reset,
  };
}

export type HelpSession = ReturnType<typeof useHelpSearch>;
