import { useSyncExternalStore } from 'react';

// Throwaway customer-research prototype. Enable in development with
// /ghost/#/posts?editingLockPrototype=<post id>. Only takeover state is simulated;
// no presence or ownership is written to the server. Reload resets the lock.
// Remember only which post to demonstrate, so resetting also works after navigation
// has removed the URL parameter. An empty parameter switches the prototype off.
function demoPostId() {
  if (!import.meta.env.DEV) {
    return null;
  }
  const key = 'ghost:editing-lock-prototype:post';
  const requested = new URLSearchParams(window.location.hash.split('?')[1]).get(
    'editingLockPrototype',
  );
  if (requested !== null) {
    if (requested) {
      sessionStorage.setItem(key, requested);
    } else {
      sessionStorage.removeItem(key);
    }
  }
  return sessionStorage.getItem(key);
}
const postId = demoPostId();

type Phase = 'locked' | 'taking-over' | 'editing';
let phase: Phase = 'locked';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setPhase(next: Phase) {
  phase = next;
  listeners.forEach((listener) => listener());
  // eslint-disable-next-line no-console -- Expose this throwaway prototype's state during research.
  console.info('[Editing lock prototype]', next);
}

export function takeOverEditingPrototype() {
  if (!postId || phase !== 'locked') {
    return;
  }
  setPhase('taking-over');
  window.setTimeout(() => setPhase('editing'), 2000);
}

export function useEditingLockPrototype(id?: string | null) {
  const currentPhase = useSyncExternalStore(subscribe, () => phase);
  const isDemoPost = !!postId && id === postId;
  return {
    isDemoPost,
    phase: currentPhase,
    locked: isDemoPost && currentPhase !== 'editing',
  };
}
