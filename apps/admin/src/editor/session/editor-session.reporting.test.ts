import { describe, expect, it, vi } from 'vitest';
import { SessionExpiredError } from '@tryghost/admin-x-framework/errors';
import { DEFAULT_TITLE } from '@/editor/engine/save-engine';
import {
  body,
  record,
  sessionHarness,
  updateCollision,
} from '@/editor/session/__test-utils__/session-harness';
import type { EditorSaveFailure, EditorLeaveConfirmation } from './editor-session';

function reporting(...args: Parameters<typeof sessionHarness>) {
  const failures: EditorSaveFailure[] = [];
  const leaves: EditorLeaveConfirmation[] = [];
  const [options = {}, hooks] = args;
  const harness = sessionHarness(
    {
      ...options,
      onSaveFailed: (failure) => failures.push(failure),
      onLeaveConfirmed: (leave) => leaves.push(leave),
    },
    hooks,
  );
  return { ...harness, failures, leaves };
}

describe('createEditorSession reporting', () => {
  it('reports a failed update with the post id and its persisted status', async () => {
    const collision = updateCollision();
    const { session, failures } = reporting(
      { record: record({ status: 'published' }) },
      { failUpdateWith: collision },
    );
    session.patchTitle('Edited');

    await session.dispatchExplicit();

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      command: { kind: 'explicit', requiresRevision: true, requiresReconfirmation: false },
      error: { kind: 'conflict', message: collision.message, cause: collision },
      persisted: true,
      postId: 'abc123',
      status: 'published',
    });
    expect(typeof failures[0].durationMs).toBe('number');
  });

  it('reports a create that answered with nothing as unpersisted', async () => {
    const { session, failures, create } = reporting();
    create.mockResolvedValueOnce(undefined as never);
    session.patchTitle('New');

    await session.dispatchExplicit();

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      error: { kind: 'unknown', message: 'Couldn’t save this post.' },
      persisted: false,
      postId: null,
      status: 'draft',
    });
  });

  it('reports an expired session only once re-authentication is abandoned', async () => {
    const { session, failures } = reporting(
      { record: record() },
      { failUpdateWith: new SessionExpiredError(new Response(null, { status: 401 }), undefined) },
    );
    session.patchTitle('Edited');
    const completion = session.dispatchExplicit();
    await vi.waitFor(() => expect(session.getState().kind).toBe('reauth-pending'));
    expect(failures).toEqual([]);

    session.reauthAbandoned();
    await completion;

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ error: { kind: 'session-invalid' } });
  });

  it('reports a leave the writer has to confirm with why the post is dirty', async () => {
    const { session, leaves } = reporting(
      { record: record({ status: 'published' }) },
      { failUpdateWith: updateCollision() },
    );
    session.setBaseline(record().lexical);
    session.patchLexical(body('Hello and more'));
    await session.dispatchExplicit();

    expect(await session.leaveRequested()).toBe('confirm');

    expect(leaves).toEqual([
      {
        postId: 'abc123',
        status: 'published',
        engineState: 'conflict',
        reasons: ['POST_HAS_ERROR', 'SCRATCH_DIVERGED_FROM_SECONDARY'],
      },
    ]);
  });

  it('reports nothing for a leave decided after the session was disposed', async () => {
    const { session, leaves } = reporting(
      { record: record({ status: 'published' }) },
      { failUpdateWith: updateCollision() },
    );
    session.patchTitle('Edited');
    await session.dispatchExplicit();

    const pending = session.leaveRequested();
    session.dispose();

    expect(await pending).toBe('confirm');
    expect(leaves).toEqual([]);
  });

  it('routes a throwing leave reporter to onError and still answers', async () => {
    const onError = vi.fn();
    const { session } = sessionHarness(
      {
        record: record({ status: 'published' }),
        onError,
        onLeaveConfirmed: () => {
          throw new Error('reporter down');
        },
      },
      { failUpdateWith: updateCollision() },
    );
    session.patchTitle('Edited');
    await session.dispatchExplicit();
    onError.mockClear();

    expect(await session.leaveRequested()).toBe('confirm');

    expect(onError).toHaveBeenCalledWith(new Error('reporter down'));
  });

  it('reports nothing for a leave that loses nothing', async () => {
    const { session, leaves } = reporting({ record: record() });

    expect(await session.leaveRequested()).toBe('proceed');

    expect(leaves).toEqual([]);
  });

  it('reports a draft disposed with a title but an untitled slug', () => {
    const onError = vi.fn();
    const { session } = sessionHarness({
      record: record({ title: 'A real title', slug: 'untitled-2' }),
      onError,
    });

    session.dispose();
    session.dispose();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(new Error('Draft post has title set with untitled slug'), {
      extra: { slug: 'untitled-2', title: 'A real title' },
    });
  });

  it.each([
    ['the default title', { title: DEFAULT_TITLE, slug: 'untitled' }],
    ['a matching slug', { title: 'A real title', slug: 'a-real-title' }],
    ['a published post', { title: 'A real title', slug: 'untitled', status: 'published' as const }],
  ])('reports nothing on dispose for %s', (_label, fields) => {
    const onError = vi.fn();
    const { session } = sessionHarness({ record: record(fields), onError });

    session.dispose();

    expect(onError).not.toHaveBeenCalled();
  });
});
