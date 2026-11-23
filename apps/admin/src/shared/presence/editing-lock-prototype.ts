import { useSyncExternalStore } from 'react';

// Throwaway customer-research prototype. Enable in development with
// /ghost/#/posts?editingLockPrototype=<post id>. All collaboration state is simulated;
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
const versionKey = 'ghost:editing-lock-prototype:version';
const savedVersion = postId ? sessionStorage.getItem(versionKey) : null;

type Phase = 'locked' | 'taking-over' | 'editing';
export type EditingLockExperience = 'taking-over' | 'being-taken-over';
export type EditingLockVersion = 'lock-avatar' | 'avatars-only';
export const PROTOTYPE_STAFF = [
  { id: 'alex', name: 'Alex Smith' },
  { id: 'sam', name: 'Sam Lee' },
  { id: 'jamie', name: 'Jamie Chen' },
] as const;
export type PrototypeStaffId = (typeof PROTOTYPE_STAFF)[number]['id'];
type PrototypeState = {
  version: EditingLockVersion;
  experience: EditingLockExperience;
  phase: Phase;
  editorId: PrototypeStaffId | 'you';
  present: PrototypeStaffId[];
  multiplePeople: boolean;
  notice: boolean;
  revision: number;
};
let state: PrototypeState = {
  version: savedVersion === 'avatars-only' ? 'avatars-only' : 'lock-avatar',
  experience: 'taking-over',
  phase: 'locked',
  editorId: 'alex',
  present: ['alex'],
  multiplePeople: false,
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

export function resetEditingLockPrototype(
  experience = state.experience,
  multiplePeople = state.multiplePeople,
) {
  clearTimeout(takeoverTimer);
  update({
    experience,
    phase: experience === 'taking-over' ? 'locked' : 'editing',
    editorId: experience === 'taking-over' ? 'alex' : 'you',
    multiplePeople,
    present: multiplePeople
      ? PROTOTYPE_STAFF.map((person) => person.id)
      : experience === 'taking-over'
        ? ['alex']
        : [],
    notice: false,
    revision: state.revision + 1,
  });
}

export function setMultiplePeoplePrototype(enabled: boolean) {
  resetEditingLockPrototype(state.experience, enabled);
}

export function setEditingLockPrototypeVersion(version: EditingLockVersion) {
  sessionStorage.setItem(versionKey, version);
  update({ version });
}

export function simulatePersonOpeningPrototype(id: PrototypeStaffId) {
  if (!state.present.includes(id)) {
    update({ present: [...state.present, id] });
  }
}

export function simulatePersonClosingPrototype(id: PrototypeStaffId) {
  const present = state.present.filter((person) => person !== id);
  if (state.editorId === id) {
    // Closing the active editor's post releases the prototype lock.
    clearTimeout(takeoverTimer);
    update({
      present,
      editorId: 'you',
      phase: 'editing',
      notice: false,
      revision: state.revision + 1,
    });
  } else {
    update({ present });
  }
}

export function simulatePersonTakingOverPrototype(id: PrototypeStaffId) {
  if (state.present.includes(id) && state.editorId !== id && state.phase !== 'taking-over') {
    update({
      editorId: id,
      phase: 'locked',
      notice: state.notice || state.editorId === 'you',
      revision: state.revision + 1,
    });
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
  takeoverTimer = setTimeout(() => update({ phase: 'editing', editorId: 'you' }), 2000);
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
