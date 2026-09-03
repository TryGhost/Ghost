import { describe, expect, it } from 'vitest';
import { hasUnsavedWork, isCreatedIdUrlSwap } from './leave-guard';
import type { SaveEngineState } from '@/editor/engine/save-engine';

const SESSION = 'session-key';

function swapTo(pathname: string, editorSession: string | null = SESSION) {
  return { pathname, state: editorSession === null ? null : { editorSession } };
}

describe('hasUnsavedWork', () => {
  it('guards a dirty post whatever the engine is doing', () => {
    const states: SaveEngineState[] = [
      { kind: 'idle' },
      { kind: 'debouncing' },
      { kind: 'halted' },
      { kind: 'crashed' },
      { kind: 'disposed' },
    ];
    for (const state of states) {
      expect(hasUnsavedWork(state, true)).toBe(true);
    }
  });

  it('guards a clean post while a write is still outstanding', () => {
    expect(hasUnsavedWork({ kind: 'saving', intent: 'autosave' }, false)).toBe(true);
    expect(
      hasUnsavedWork({ kind: 'pending-coalesced', intent: 'autosave', pending: 'explicit' }, false),
    ).toBe(true);
  });

  it('guards a clean post whose command is frozen behind re-auth', () => {
    expect(hasUnsavedWork({ kind: 'reauth-pending', intent: 'publish' }, false)).toBe(true);
  });

  it('leaves a failed save to the post it left dirty', () => {
    const error = { kind: 'unknown' as const, message: 'Nope' };
    // A failed save never discards its payload, so the post carries the guard.
    expect(hasUnsavedWork({ kind: 'error', intent: 'autosave', error }, true)).toBe(true);
    expect(hasUnsavedWork({ kind: 'conflict', intent: 'autosave', error }, true)).toBe(true);
    expect(hasUnsavedWork({ kind: 'error', intent: 'autosave', error }, false)).toBe(false);
    expect(hasUnsavedWork({ kind: 'conflict', intent: 'autosave', error }, false)).toBe(false);
  });

  it('lets a settled clean post go', () => {
    expect(hasUnsavedWork({ kind: 'idle' }, false)).toBe(false);
    expect(hasUnsavedWork({ kind: 'debouncing' }, false)).toBe(false);
    expect(hasUnsavedWork({ kind: 'disposed' }, false)).toBe(false);
  });
});

describe('isCreatedIdUrlSwap', () => {
  it('recognizes the session replacing its own new-post URL', () => {
    expect(
      isCreatedIdUrlSwap({ pathname: '/editor/post' }, swapTo('/editor/post/abc'), 'post', SESSION),
    ).toBe(true);
    expect(
      isCreatedIdUrlSwap({ pathname: '/editor/page' }, swapTo('/editor/page/abc'), 'page', SESSION),
    ).toBe(true);
  });

  it('rejects a swap that does not carry this session', () => {
    expect(
      isCreatedIdUrlSwap(
        { pathname: '/editor/post' },
        swapTo('/editor/post/abc', 'other'),
        'post',
        SESSION,
      ),
    ).toBe(false);
    expect(
      isCreatedIdUrlSwap(
        { pathname: '/editor/post' },
        swapTo('/editor/post/abc', null),
        'post',
        SESSION,
      ),
    ).toBe(false);
  });

  it('rejects a writer leaving the editor', () => {
    expect(
      isCreatedIdUrlSwap({ pathname: '/editor/post' }, swapTo('/posts'), 'post', SESSION),
    ).toBe(false);
    expect(
      isCreatedIdUrlSwap(
        { pathname: '/editor/post/abc' },
        swapTo('/editor/post/def'),
        'post',
        SESSION,
      ),
    ).toBe(false);
    expect(
      isCreatedIdUrlSwap(
        { pathname: '/editor/post' },
        swapTo('/editor/post/abc/extra'),
        'post',
        SESSION,
      ),
    ).toBe(false);
    expect(
      isCreatedIdUrlSwap({ pathname: '/editor/post' }, swapTo('/editor/post'), 'post', SESSION),
    ).toBe(false);
  });
});
