import { describe, expect, it, vi } from 'vitest';
import { buildLexicalParagraph } from '@tryghost/test-data';
import type { LocalRevisionWriter } from '@/editor/local-revisions';
import {
  body,
  record,
  sessionHarness,
  updateCollision,
} from '@/editor/session/__test-utils__/session-harness';

function writerSpy() {
  return {
    record: vi.fn<LocalRevisionWriter['record']>(),
    flush: vi.fn<LocalRevisionWriter['flush']>(),
    discard: vi.fn<LocalRevisionWriter['discard']>(),
    created: vi.fn<LocalRevisionWriter['created']>(),
  };
}

const LOADED_BODY = buildLexicalParagraph('Hello');

describe('Editor session local revisions', () => {
  it('records a copy of a draft once the writer changes its body', () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness({
      record: record({ tags: [{ id: 'tag-1', name: 'News', slug: 'news' }] }),
      baseline: LOADED_BODY,
      localRevisions,
    });

    session.patchLexical(body('Hello there'));

    expect(localRevisions.record).toHaveBeenCalledTimes(1);
    expect(localRevisions.record).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'abc123',
        status: 'draft',
        title: 'Hello',
        slug: 'hello',
        lexical: JSON.stringify(body('Hello there')),
        tags: [{ id: 'tag-1', name: 'News', slug: 'news' }],
      }),
    );
  });

  it('pairs the latest title with the latest body', () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness({ record: record(), baseline: LOADED_BODY, localRevisions });

    session.patchLexical(body('Hello there'));
    session.patchTitle('A new title');

    expect(localRevisions.record).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: 'A new title',
        lexical: JSON.stringify(body('Hello there')),
      }),
    );
  });

  it('records nothing for a body the hidden instance normalized the same way', () => {
    const localRevisions = writerSpy();
    const normalized = body('Hello, normalized');
    const { session } = sessionHarness({
      record: record(),
      baseline: JSON.stringify(normalized),
      localRevisions,
    });

    session.patchLexical(normalized);

    expect(localRevisions.record).not.toHaveBeenCalled();
  });

  it('records nothing while the hidden instance has not reported a baseline', () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness({ record: record(), localRevisions });

    session.patchLexical(body('Hello, normalized'));

    expect(localRevisions.record).not.toHaveBeenCalled();
  });

  it('records nothing for a post that is no longer a draft', () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness({
      record: record({ status: 'published', published_at: '2026-01-01T00:00:00.000Z' }),
      baseline: LOADED_BODY,
      localRevisions,
    });

    session.patchLexical(body('Hello there'));
    session.flushLocalRevision();
    session.dispose();

    expect(localRevisions.record).not.toHaveBeenCalled();
    expect(localRevisions.flush).not.toHaveBeenCalled();
  });

  it('records a post that has not been created yet without an id', () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness({ record: undefined, localRevisions });

    session.patchTitle('Brand new');

    expect(localRevisions.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: null, status: 'draft', title: 'Brand new' }),
    );
  });

  it('flushes the current draft when asked and it holds unsaved work', () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness({ record: record(), baseline: LOADED_BODY, localRevisions });

    session.flushLocalRevision();
    expect(localRevisions.flush).not.toHaveBeenCalled();

    session.patchLexical(body('Hello there'));
    session.flushLocalRevision();

    expect(localRevisions.flush).toHaveBeenCalledWith(
      expect.objectContaining({ lexical: JSON.stringify(body('Hello there')) }),
    );
  });

  it('leaves a copy behind when it is disposed holding unsaved work', () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness({ record: record(), baseline: LOADED_BODY, localRevisions });
    session.patchLexical(body('Hello there'));

    session.dispose();

    expect(localRevisions.flush).toHaveBeenCalledWith(
      expect.objectContaining({ lexical: JSON.stringify(body('Hello there')) }),
    );
    expect(localRevisions.discard).toHaveBeenCalled();
    expect(localRevisions.flush.mock.invocationCallOrder[0]).toBeLessThan(
      localRevisions.discard.mock.invocationCallOrder[0],
    );
  });

  it('drops the waiting copy without writing when it is disposed with nothing unsaved', () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness({ record: record(), baseline: LOADED_BODY, localRevisions });

    session.dispose();

    expect(localRevisions.flush).not.toHaveBeenCalled();
    expect(localRevisions.discard).toHaveBeenCalled();
  });

  it('leaves failing saves to the minute pace instead of flushing on each one', async () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness(
      { record: record(), baseline: LOADED_BODY, localRevisions },
      { failUpdateWith: new Error('Server exploded') },
    );
    session.patchLexical(body('Hello there'));

    await session.dispatchExplicit();
    await session.dispatchExplicit();

    expect(session.getState().kind).toBe('error');
    expect(localRevisions.record).toHaveBeenCalledTimes(1);
    expect(localRevisions.flush).not.toHaveBeenCalled();
  });

  it('flushes when a save is refused because someone else changed the post', async () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness(
      { record: record(), baseline: LOADED_BODY, localRevisions },
      { failUpdateWith: updateCollision() },
    );
    session.patchLexical(body('Hello there'));

    await session.dispatchExplicit();

    expect(session.getState().kind).toBe('conflict');
    expect(localRevisions.flush).toHaveBeenCalledWith(
      expect.objectContaining({ lexical: JSON.stringify(body('Hello there')) }),
    );
  });

  it('records nothing once the only thing unsaved is the failed save itself', async () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness(
      { record: record(), baseline: LOADED_BODY, localRevisions },
      { failUpdateWith: new Error('Server exploded') },
    );
    session.patchLexical(body('Hello there'));
    await session.dispatchExplicit();

    session.patchLexical(body('Hello'));

    expect(localRevisions.record).toHaveBeenCalledTimes(1);
  });

  it('drops the copy waiting for the minute once a save leaves nothing unsaved', async () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness({ record: record(), baseline: LOADED_BODY, localRevisions });
    session.patchLexical(body('Hello there'));
    expect(localRevisions.discard).not.toHaveBeenCalled();

    await session.dispatchExplicit();

    expect(localRevisions.discard).toHaveBeenCalled();
  });

  it('keeps the copy waiting for the minute when typing continued during the save', async () => {
    const localRevisions = writerSpy();
    let typeDuringSave = (): void => {};
    const { session } = sessionHarness(
      { record: record(), baseline: LOADED_BODY, localRevisions },
      { duringSave: () => typeDuringSave() },
    );
    typeDuringSave = () => session.patchLexical(body('Hello there, still typing'));
    session.patchLexical(body('Hello there'));

    await session.dispatchExplicit();

    expect(localRevisions.discard).not.toHaveBeenCalled();
  });

  it('tells the writer once a new post has been created', async () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness({ record: undefined, localRevisions });
    session.patchTitle('Brand new');
    expect(localRevisions.created).not.toHaveBeenCalled();

    await session.dispatchExplicit();

    expect(localRevisions.created).toHaveBeenCalledTimes(1);
  });

  it('keeps the unsaved draft before a revision replaces it', async () => {
    const localRevisions = writerSpy();
    const { session } = sessionHarness({ record: record(), baseline: LOADED_BODY, localRevisions });
    session.patchLexical(body('Typed before the restore'));

    await session.restoreRevision({
      lexical: buildLexicalParagraph('From an older revision'),
      title: 'Hello',
      custom_excerpt: null,
      feature_image: null,
      feature_image_alt: null,
      feature_image_caption: null,
    });

    expect(localRevisions.flush).toHaveBeenCalledWith(
      expect.objectContaining({ lexical: JSON.stringify(body('Typed before the restore')) }),
    );
    expect(localRevisions.flush.mock.invocationCallOrder[0]).toBeLessThan(
      localRevisions.record.mock.invocationCallOrder.at(-1) ?? 0,
    );
  });

  it('keeps editing when the writer throws', () => {
    const onError = vi.fn();
    const failure = new Error('No storage');
    const localRevisions = writerSpy();
    localRevisions.record.mockImplementation(() => {
      throw failure;
    });
    const { session } = sessionHarness({
      record: record(),
      baseline: LOADED_BODY,
      localRevisions,
      onError,
    });

    session.patchLexical(body('Hello there'));

    expect(onError).toHaveBeenCalledWith(failure);
    expect(session.getLiveLexical()).toBe(JSON.stringify(body('Hello there')));
  });
});
