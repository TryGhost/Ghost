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
 * A picked FAQ question is an article, and an exact match, so it opens before
 * its search has even run; the search fills "More from the help center" under
 * it. A typed search stays on the results, with the first one shown as a
 * preview: the nearest page isn't always the answer, so the user decides.
 */

/**
 * Where a search came from. One started by picking a question on the intro
 * screen only exists to fill "More from the help center" under its article:
 * Back from that article returns to the intro, not to a results list for a
 * question the user never typed.
 */
export type HelpSearchOrigin = 'field' | 'suggestion';

export interface HelpSearch {
  query: string;
  origin: HelpSearchOrigin;
  status: 'searching' | 'done' | 'error';
  results: HelpArticle[];
}

export interface HelpSupportDraft {
  subject: string;
  body: string;
  // PROTOTYPE: only file names are kept; a real send needs the files uploaded
  files: string[];
  status: 'draft' | 'sending' | 'sent';
}

const EMPTY_DRAFT: HelpSupportDraft = {
  subject: '',
  body: '',
  files: [],
  status: 'draft',
};

// PROTOTYPE: nothing is sent; this only stands in for the request
const SEND_DURATION = 1200;

export function useHelpSearch() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState<HelpSearch | null>(null);
  // Every query typed into the field, latest last: the message to support
  // starts from the last one. Picked questions aren't the user's own words,
  // so they're left out.
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

  /** Searches the help center for the query, replacing the last results. */
  const run = useCallback(
    async (query: string, origin: HelpSearchOrigin) => {
      stopRequest();
      const controller = new AbortController();
      request.current = controller;
      setSearch({ query, origin, status: 'searching', results: [] });

      try {
        const [hits, articles] = await Promise.all([
          searchDocsBot(query, controller.signal),
          queryClient.fetchQuery(helpCenterIndexQuery),
        ]);
        if (controller.signal.aborted) {
          return;
        }
        setSearch({ query, origin, status: 'done', results: toSearchResults(hits, articles) });
      } catch {
        // DocsBot or the help center couldn't be reached
        if (!controller.signal.aborted) {
          setSearch({ query, origin, status: 'error', results: [] });
        }
      } finally {
        if (request.current === controller) {
          request.current = null;
        }
      }
    },
    [queryClient, stopRequest],
  );

  /**
   * Searches for the text. A picked FAQ question is an article already, so it
   * opens at once while its search finds more.
   */
  const searchFor = useCallback(
    (text: string, picked: HelpArticle | null = null, origin: HelpSearchOrigin = 'field') => {
      const query = text.trim();
      if (!query) {
        return;
      }
      if (picked) {
        readArticle(picked);
      } else {
        setSearches((current) => [...current, query]);
      }
      void run(query, origin);
    },
    [readArticle, run],
  );

  const retry = useCallback(() => {
    if (search) {
      void run(search.query, search.origin);
    }
  }, [run, search]);

  /** Opens the message to support, started from the last typed search if nothing's written yet. */
  const contactSupport = useCallback(() => {
    setSupport((current) => (current.body ? current : { ...current, body: searches.at(-1) ?? '' }));
    setView('support');
  }, [searches]);

  const editSupport = useCallback(
    (patch: Partial<Pick<HelpSupportDraft, 'subject' | 'body' | 'files'>>) =>
      setSupport((current) => ({ ...current, ...patch })),
    [],
  );

  // PROTOTYPE: nothing is sent. Ghost(Pro) support is email today: the
  // quickest real version opens a mailto:support@ghost.org draft with the
  // message (getSupportContext in help-signals.ts lists the context a send
  // could add, should that be wanted).
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

  /** Back from an article: to the results, or to the intro if the article was a picked question. */
  const leaveArticle = useCallback(() => {
    if (search?.origin === 'suggestion') {
      stopRequest();
      setSearch(null);
    }
    setView('search');
  }, [search, stopRequest]);

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
