import { createContext, useCallback, useContext, useState } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import { withoutTrailingSlash } from '@/hooks/use-history-pop-navigation-guard';

interface EditorSessionLocationState {
  editorSession?: string;
}

const EditorSessionKeyContext = createContext('');
const EditorSessionCreatedContext = createContext<() => void>(() => {});

/** Hands the key of the session the editor screen mounted to the editor inside it. */
export const EditorSessionKeyProvider = EditorSessionKeyContext.Provider;

/** Hands the editor a way to tell its screen that the session created its post. */
export const EditorSessionCreatedProvider = EditorSessionCreatedContext.Provider;

/**
 * The key of the editing session the editor screen mounted. A create replaces
 * the URL carrying it, so the screen keeps the session across the swap.
 */
export function useEditorSessionKey(): string {
  return useContext(EditorSessionKeyContext);
}

/** Tells the editor screen that the session it mounted has created its post. */
export function useMarkEditorSessionCreated(): () => void {
  return useContext(EditorSessionCreatedContext);
}

interface ScreenSession {
  /** Random per screen: a key carried in a history entry outlives the page that wrote it. */
  screen: string;
  count: number;
  /** The path of the post the session is on, without a trailing slash. */
  path: string;
  /** The location the key was last decided for. */
  location: object;
  /** Whether the session has created its post. */
  created: boolean;
}

export interface EditorScreenSession {
  key: string;
  markCreated: () => void;
}

/**
 * Keys the session the editor screen mounts. Navigation that stays on its post
 * keeps it, counting the id a create acquired, whichever history entry it
 * reaches; any other post, a new one included, gets a new session.
 */
export function useEditorScreenSessionKey(): EditorScreenSession {
  const location = useLocation();
  const path = withoutTrailingSlash(location.pathname);
  const [session, setSession] = useState<ScreenSession>(() => ({
    screen: screenId(),
    count: 0,
    path,
    location,
    created: false,
  }));
  const markCreated = useCallback(() => {
    setSession((current) => (current.created ? current : { ...current, created: true }));
  }, []);
  const key = `${session.screen}:${session.count}`;
  if (location === session.location) {
    return { key, markCreated };
  }
  const carried = (location.state as EditorSessionLocationState | null)?.editorSession;
  // The router can render a create's URL replace and a later navigation as one,
  // so a new-post URL reached after the create is a new post either way.
  const isNewPost = path === session.path && session.created && isNewPostPath(path);
  // A create's URL replace carries the key to the post's new id.
  const keeps = path === session.path ? !isNewPost : carried === key;
  const next: ScreenSession = keeps
    ? { ...session, path, location }
    : { ...session, path, location, count: session.count + 1, created: false };
  setSession(next);
  return { key: `${next.screen}:${next.count}`, markCreated };
}

function screenId(): string {
  return Array.from(crypto.getRandomValues(new Uint32Array(2)), (part) => part.toString(36)).join(
    '',
  );
}

function isNewPostPath(path: string): boolean {
  return path.split('/').filter(Boolean).length === 2;
}
