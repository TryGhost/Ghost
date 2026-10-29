import { useCallback, useEffect, useRef, useState } from 'react';
import type { HelpArticle } from './help-center';

/*
 * The support session: the message being written to the Ghost(Pro) support
 * team, the FAQ article being read beside it, if any, and which of the two
 * the panel shows (its view).
 *
 * The message is the thing; the articles are there to answer it before it's
 * sent. Reading one never touches the draft, so the user comes back to the
 * message as they left it, and send it from there. The session
 * lives in HelpPanel, so closing the panel or moving between pages keeps it.
 */

export interface HelpMessage {
  body: string;
  // PROTOTYPE: only file names are kept; a real send needs the files uploaded
  files: string[];
  status: 'draft' | 'sending' | 'sent';
}

const EMPTY_MESSAGE: HelpMessage = { body: '', files: [], status: 'draft' };

// PROTOTYPE: nothing is sent; this only stands in for the request
const SEND_DURATION = 1200;

export function useHelpSession() {
  const [message, setMessage] = useState<HelpMessage>(EMPTY_MESSAGE);
  const [view, setView] = useState<'form' | 'article'>('form');
  // The article being read in the panel, while the view is 'article'
  const [reading, setReading] = useState<HelpArticle | null>(null);
  const [openedArticles, setOpenedArticles] = useState<HelpArticle[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const editMessage = useCallback(
    (patch: Partial<Pick<HelpMessage, 'body' | 'files'>>) =>
      setMessage((current) => ({ ...current, ...patch })),
    [],
  );

  /** Reads an article in the panel, over the message. */
  const readArticle = useCallback((article: HelpArticle) => {
    setOpenedArticles((current) =>
      current.some(({ id }) => id === article.id) ? current : [...current, article],
    );
    setReading(article);
    setView('article');
  }, []);

  /** Back to the message, as it was left. */
  const leaveArticle = useCallback(() => setView('form'), []);

  // PROTOTYPE: nothing is sent. Ghost(Pro) support is email today: the
  // quickest real version opens a mailto:support@ghost.org draft with the
  // message (getSupportContext in help-signals.ts lists the context a send
  // could add, should that be wanted).
  const send = useCallback(() => {
    setView('form');
    setMessage((current) => ({ ...current, status: 'sending' }));
    timers.current.push(
      window.setTimeout(
        () => setMessage((current) => ({ ...current, status: 'sent' })),
        SEND_DURATION,
      ),
    );
  }, []);

  /** Back to the start: a blank message, nothing read. */
  const reset = useCallback(() => {
    setMessage(EMPTY_MESSAGE);
    setOpenedArticles([]);
    setReading(null);
    setView('form');
  }, []);

  return {
    message,
    canSend: message.body.trim() !== '' && message.status === 'draft',
    view,
    reading,
    openedArticles,
    editMessage,
    readArticle,
    leaveArticle,
    send,
    reset,
  };
}

export type HelpSession = ReturnType<typeof useHelpSession>;
