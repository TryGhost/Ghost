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
export type EditingLockExperience = 'taking-over' | 'being-taken-over';
let state = {
  experience: 'taking-over' as EditingLockExperience,
  phase: 'locked' as Phase,
  alexPresent: true,
  notice: false,
  revision: 0,
};
let takeoverTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(next: Partial<typeof state>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
  // eslint-disable-next-line no-console -- Expose this throwaway prototype's state during research.
  console.info('[Editing lock prototype]', state);
}

export function resetEditingLockPrototype(experience = state.experience) {
  clearTimeout(takeoverTimer);
  update({
    experience,
    phase: experience === 'taking-over' ? 'locked' : 'editing',
    alexPresent: experience === 'taking-over',
    notice: false,
    revision: state.revision + 1,
  });
}

export function simulateAlexOpeningPrototype() {
  update({ alexPresent: true });
}

export function simulateAlexTakingOverPrototype() {
  if (state.experience === 'being-taken-over' && state.alexPresent && state.phase === 'editing') {
    update({ phase: 'locked', notice: true, revision: state.revision + 1 });
  }
}

export function dismissEditingLockPrototypeNotice() {
  update({ notice: false });
}

export function takeOverEditingPrototype() {
  if (!postId || state.phase !== 'locked') {
    return;
  }
  update({ phase: 'taking-over', notice: false });
  takeoverTimer = setTimeout(() => update({ phase: 'editing' }), 2000);
}

export function useEditingLockPrototype(id?: string | null) {
  const current = useSyncExternalStore(subscribe, () => state);
  const isDemoPost = !!postId && id === postId;
  return {
    isDemoPost,
    ...current,
    enabled: !!postId,
    locked: isDemoPost && current.phase !== 'editing',
  };
}
