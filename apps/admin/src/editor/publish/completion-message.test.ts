import { describe, expect, it } from 'vitest';
import {
  CONFLICT_MESSAGE,
  DROPPED_MESSAGE,
  REAUTH_MESSAGE,
  UNREACHABLE_MESSAGE,
  describeCompletionFailure,
} from '@/editor/publish/completion-message';
import type { SaveCompletion, SaveErrorKind } from '@/editor/engine/save-engine';

function failed(kind: SaveErrorKind, message = 'boom'): SaveCompletion {
  return { kind: 'failed', error: { kind, message }, executedAs: 'publish' };
}

describe('describeCompletionFailure', () => {
  it('returns nothing for a save that landed', () => {
    expect(
      describeCompletionFailure({
        kind: 'saved',
        result: { id: '1', status: 'published', updatedAt: 'now' },
        executedAs: 'publish',
      }),
    ).toBeNull();
  });

  it('sends a re-auth interruption back to confirm with an explanation', () => {
    expect(describeCompletionFailure({ kind: 'needs-retry' })).toEqual({ message: REAUTH_MESSAGE });
    expect(describeCompletionFailure(failed('session-invalid'))).toEqual({
      message: REAUTH_MESSAGE,
    });
  });

  it('maps the engine error kinds onto the flow copy', () => {
    expect(describeCompletionFailure(failed('validation', 'Title is too long'))).toEqual({
      message: 'Validation failed: Title is too long',
    });
    expect(describeCompletionFailure(failed('transport'))).toEqual({
      message: UNREACHABLE_MESSAGE,
    });
    expect(describeCompletionFailure(failed('conflict'))).toEqual({ message: CONFLICT_MESSAGE });
    expect(describeCompletionFailure(failed('unknown', 'Something broke'))).toEqual({
      message: 'Something broke',
    });
  });

  it('splits a host limit so the upgrade phrase can be linked', () => {
    const failure = describeCompletionFailure(
      failed('host-limit', 'You have reached your limit, please upgrade to continue.'),
    );

    expect(failure?.parts).toEqual([
      { text: 'You have reached your limit, ', kind: 'text' },
      { text: 'please upgrade', kind: 'upgrade' },
      { text: ' to continue.', kind: 'text' },
    ]);
  });

  it('treats a dropped or superseded command as no longer publishable', () => {
    expect(describeCompletionFailure({ kind: 'dropped', reason: 'not-draft' })).toEqual({
      message: DROPPED_MESSAGE,
    });
    expect(describeCompletionFailure({ kind: 'superseded', by: 'publish' })).toEqual({
      message: DROPPED_MESSAGE,
    });
  });
});
