import { describe, expect, it } from 'vitest';
import { buildLexicalParagraph } from '@tryghost/test-data';
import {
  body,
  LOADED_AT,
  record,
  sessionHarness,
  updateCollision,
} from '@/editor/session/__test-utils__/session-harness';

describe('createEditorSession', () => {
  it('adopts a refetched record without re-baselining', () => {
    const { session } = sessionHarness({ record: record() });
    const edited = body('Unsaved edit');

    session.setBaseline(record().lexical);
    session.patchLexical(edited);
    const accepted = session.recordRefetched(record({ updated_at: '2026-01-02T00:00:00.000Z' }));

    expect(accepted).toBe(true);
    expect(session.getSaveSnapshot().isDirty).toBe(true);
  });

  it('treats a refetched title that differs only by whitespace as unchanged', () => {
    const { session } = sessionHarness({ record: record({ title: 'Hello' }) });
    session.setBaseline(record().lexical);

    session.recordRefetched(record({ title: 'Hello ', updated_at: '2026-01-02T00:00:00.000Z' }));

    expect(session.getSaveSnapshot()).toMatchObject({
      title: 'Hello',
      isDirty: false,
      titleDirty: false,
    });
  });

  it.each([
    ['has no collision token', null],
    ['has a malformed collision token', 'not-a-date'],
    ['is older', '2025-12-31T23:59:59.000Z'],
  ])('ignores a refetched record that %s', (_label, updatedAt) => {
    const { session } = sessionHarness({ record: record() });
    session.patchTitle('My title');

    const accepted = session.recordRefetched(
      record({ title: 'Stale title', status: 'published', updated_at: updatedAt }),
    );

    expect(accepted).toBe(false);
    expect(session.getSaveSnapshot()).toMatchObject({
      title: 'My title',
      status: 'draft',
      updatedAt: LOADED_AT,
    });
  });

  it('ignores a refetch that lands after the session was disposed', () => {
    const { session } = sessionHarness({ record: record() });
    session.dispose();

    const accepted = session.recordRefetched(
      record({ status: 'published', updated_at: '2026-01-02T00:00:00.000Z' }),
    );

    expect(accepted).toBe(false);
    expect(session.getSaveSnapshot()).toMatchObject({
      status: 'draft',
      updatedAt: LOADED_AT,
    });
  });

  it('replaces the document when the writer reloads it', async () => {
    const { session } = sessionHarness({ record: record() }, { failUpdateWith: updateCollision() });
    const reloaded = record({
      title: 'Their title',
      lexical: buildLexicalParagraph('Their words'),
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    session.setBaseline(record().lexical);
    session.patchLexical(body('Unsaved edit'));
    await session.dispatchExplicit();
    expect(session.recordReloaded(reloaded)).toBe(true);
    session.setBaseline(reloaded.lexical);

    const snapshot = session.getSaveSnapshot();
    expect(snapshot.isDirty).toBe(false);
    expect(snapshot.title).toBe('Their title');
    expect(snapshot.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(session.getLiveLexical()).toBe(reloaded.lexical);
  });

  it('notifies leave-guard subscribers when a reload clears unsaved work', async () => {
    const { session } = sessionHarness({ record: record() }, { failUpdateWith: updateCollision() });
    session.patchTitle('My unsaved title');
    await session.dispatchExplicit();
    expect(session.isDirty()).toBe(true);
    const seen: boolean[] = [];
    session.subscribe(() => seen.push(session.isDirty()));

    expect(session.recordReloaded(record({ updated_at: '2026-01-02T00:00:00.000Z' }))).toBe(true);

    expect(session.isDirty()).toBe(false);
    expect(seen.at(-1)).toBe(false);
    expect(await session.leaveRequested()).toBe('proceed');
  });

  it('sends the reloaded collision token on the next save', async () => {
    const { session, state } = sessionHarness(
      { record: record() },
      { failUpdateWith: updateCollision() },
    );

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    expect(session.recordReloaded(record({ updated_at: '2026-01-02T00:00:00.000Z' }))).toBe(true);
    session.patchLexical(body('Written on top of theirs'));
    await session.dispatchExplicit();

    expect(state.updates[1].payload.updated_at).toBe('2026-01-02T00:00:00.000Z');
  });

  it('leaves the conflict state once the document has been reloaded', async () => {
    const { session } = sessionHarness({ record: record() }, { failUpdateWith: updateCollision() });

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    expect(session.getState().kind).toBe('conflict');

    const accepted = session.recordReloaded(record({ updated_at: '2026-01-02T00:00:00.000Z' }));

    expect(accepted).toBe(true);
    expect(session.getState().kind).toBe('idle');
  });

  it('keeps the conflict while the reload brings back the token the server rejected', async () => {
    const { session } = sessionHarness({ record: record() }, { failUpdateWith: updateCollision() });

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();

    const accepted = session.recordReloaded(
      record({
        title: 'Their title',
        lexical: buildLexicalParagraph('Their words'),
        updated_at: LOADED_AT,
      }),
    );

    expect(accepted).toBe(false);
    expect(session.getState().kind).toBe('conflict');
    expect(session.getSaveSnapshot().title).toBe('Hello');
    expect(session.getLiveLexical()).toBe(JSON.stringify(body('Mine')));
  });

  it('accepts a reload at a token a refetch learned after the rejected save', async () => {
    const { session } = sessionHarness({ record: record() }, { failUpdateWith: updateCollision() });
    const newer = record({
      title: 'Their title',
      lexical: buildLexicalParagraph('Their words'),
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    expect(session.recordRefetched(newer)).toBe(true);

    expect(session.recordReloaded(newer)).toBe(true);
    expect(session.getState().kind).toBe('idle');
    expect(session.getSaveSnapshot().title).toBe('Their title');
    expect(session.getLiveLexical()).toBe(newer.lexical);
  });

  it.each([
    ['has no collision token', null],
    ['has a malformed collision token', 'not-a-date'],
    ['is older', '2025-12-31T23:59:59.000Z'],
  ])('keeps local content when the reloaded record %s', (_label, updatedAt) => {
    const { session } = sessionHarness({ record: record() });
    session.patchTitle('My title');
    session.patchLexical(body('My words'));

    const accepted = session.recordReloaded(
      record({
        title: 'Their title',
        lexical: buildLexicalParagraph('Their words'),
        updated_at: updatedAt,
      }),
    );

    expect(accepted).toBe(false);
    expect(session.getSaveSnapshot().title).toBe('My title');
    expect(session.getLiveLexical()).toBe(JSON.stringify(body('My words')));
  });

  it('follows the reloaded record when it derives the next slug', async () => {
    const { session, state } = sessionHarness(
      { record: record() },
      { failUpdateWith: updateCollision() },
    );

    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    expect(
      session.recordReloaded(
        record({
          title: 'Their title',
          slug: 'their-slug',
          updated_at: '2026-01-02T00:00:00.000Z',
        }),
      ),
    ).toBe(true);
    session.patchLexical(body('Written on top of theirs'));
    await session.dispatchExplicit();

    // Reloaded title and slug agree, so the save keeps their slug rather than
    // regenerating one from the title this session opened with.
    expect(state.updates[1].payload.slug).toBe('their-slug');
  });

  it('moves the edit version when the document is replaced', async () => {
    const { session } = sessionHarness({ record: record() }, { failUpdateWith: updateCollision() });
    session.patchLexical(body('Mine'));
    await session.dispatchExplicit();
    const before = session.getSaveSnapshot().version;

    expect(session.recordReloaded(record({ updated_at: '2026-01-02T00:00:00.000Z' }))).toBe(true);

    expect(session.getSaveSnapshot().version).toBeGreaterThan(before);
  });

  it('ignores a reload that lands after the session was disposed', () => {
    const { session } = sessionHarness({ record: record() });

    session.dispose();
    session.recordReloaded(record({ title: 'Their title' }));

    expect(session.getSaveSnapshot().title).toBe('Hello');
  });

  it('ignores a reload of a different post', () => {
    const { session } = sessionHarness({ record: record() });

    const accepted = session.recordReloaded(
      record({
        id: 'someone-else',
        title: 'Not this one',
        updated_at: '2026-01-02T00:00:00.000Z',
      }),
    );

    expect(accepted).toBe(false);
    expect(session.getSaveSnapshot().title).toBe('Hello');
  });
});
