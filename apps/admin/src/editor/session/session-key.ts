import { createContext, useContext, useState } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import { withoutTrailingSlash } from '@/hooks/use-history-pop-navigation-guard';

interface EditorSessionLocationState {
  editorSession?: string;
}

const EditorSessionKeyContext = createContext('');

/** Hands the key of the session the editor screen mounted to the editor inside it. */
export const EditorSessionKeyProvider = EditorSessionKeyContext.Provider;

/**
 * The key of the editing session the editor screen mounted. A create replaces
 * the URL carrying it, so the screen keeps the session across the swap.
 */
export function useEditorSessionKey(): string {
  return useContext(EditorSessionKeyContext);
}

interface ScreenSession {
  /** Random per screen: a key carried in a history entry outlives the page that wrote it. */
  screen: string;
  count: number;
  /** The path of the post the session is on, without a trailing slash. */
  path: string;
}

/**
 * Keys the session the editor screen mounts. Navigation that stays on its post
 * keeps it, counting the id a create acquired, whichever history entry it
 * reaches; any other post, a new one included, gets a new session.
 */
export function useEditorScreenSessionKey(): string {
  const location = useLocation();
  const path = withoutTrailingSlash(location.pathname);
  const [session, setSession] = useState<ScreenSession>(() => ({
    screen: Math.random().toString(36).slice(2),
    count: 0,
    path,
  }));
  const key = `${session.screen}:${session.count}`;
  if (path === session.path) {
    return key;
  }
  // A create's URL replace carries the key to the post's new id.
  const carried = (location.state as EditorSessionLocationState | null)?.editorSession;
  const next = { ...session, path, count: carried === key ? session.count : session.count + 1 };
  setSession(next);
  return `${next.screen}:${next.count}`;
}
