import { describe, expect, it, vi } from 'vitest';
import { slugify } from '@tryghost/string';
import { buildLexicalParagraph } from '@tryghost/test-data';
import {
  createEditorSession,
  type EditorSessionOptions,
  type EditorWritePayload,
} from './editor-session';
import type { EditorRecord } from './projection';

const LOADED_AT = '2026-01-01T00:00:00.000Z';

function body(text: string): unknown {
  return JSON.parse(buildLexicalParagraph(text));
}

function record(overrides: Partial<EditorRecord> = {}): EditorRecord {
  return {
    id: 'abc123',
    uuid: 'uuid',
    url: 'https://example.com/hello/',
    title: 'Hello',
    slug: 'hello',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello'),
    updated_at: LOADED_AT,
    published_at: null,
    tags: [],
    ...overrides,
  };
}

interface Harness {
  updates: Array<{ payload: EditorWritePayload; saveRevision?: boolean }>;
  creates: EditorWritePayload[];
  acquiredIds: string[];
  /** The record every acknowledgement answers with; tests advance it. */
  acknowledged: EditorRecord;
}

function harness(options: Partial<EditorSessionOptions> = {}) {
  const state: Harness = {
    updates: [],
    creates: [],
    acquiredIds: [],
    acknowledged: record(),
  };
  let saveCount = 0;

  const session = createEditorSession({
    saveFailureMessage: 'Couldn’t save this post.',
    onIdAcquired: (id) => state.acquiredIds.push(id),
    onError: vi.fn(),
    transport: {
      create: (payload) => {
        state.creates.push(payload);
        saveCount += 1;
        state.acknowledged = record({
          ...state.acknowledged,
          id: 'created-id',
          title: payload.title as string,
          slug: payload.slug as string,
          lexical: payload.lexical as string,
          updated_at: `2026-01-01T00:00:0${saveCount}.000Z`,
        });
        return Promise.resolve(state.acknowledged);
      },
      update: (payload, writeOptions) => {
        state.updates.push({ payload, saveRevision: writeOptions.saveRevision });
        saveCount += 1;
        state.acknowledged = record({
          ...state.acknowledged,
          title: payload.title as string,
          slug: payload.slug as string,
          lexical: payload.lexical as string,
          custom_excerpt: (payload.custom_excerpt ?? null) as string | null,
          updated_at: `2026-01-01T00:00:0${saveCount}.000Z`,
        });
        return Promise.resolve(state.acknowledged);
      },
      generateSlug: (text) => Promise.resolve(slugify(text)),
    },
    ...options,
  });

  return { session, state };
}

describe('createEditorSession', () => {
  it('loads a post clean and dirties it on the first edit', () => {
    const { session } = harness({ record: record() });

    expect(session.isDirty()).toBe(false);

    session.patchLexical(body('Hello and more'));

    expect(session.isDirty()).toBe(true);
  });

  it('submits the edited body and lands the post clean again', async () => {
    const { session, state } = harness({ record: record() });
    const edited = body('Hello and more');

    session.setBaseline(record().lexical);
    session.patchLexical(edited);
    await session.dispatchExplicit();

    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].payload).toMatchObject({
      id: 'abc123',
      title: 'Hello',
      slug: 'hello',
      lexical: JSON.stringify(edited),
      updated_at: LOADED_AT,
      status: 'draft',
    });
    expect(state.updates[0].saveRevision).toBe(true);
    expect(session.isDirty()).toBe(false);
  });

  it('sends the acknowledged collision token on the next save', async () => {
    const { session, state } = harness({ record: record() });

    session.patchLexical(body('One'));
    await session.dispatchExplicit();
    session.patchLexical(body('Two'));
    await session.dispatchExplicit();

    expect(state.updates[0].payload.updated_at).toBe(LOADED_AT);
    expect(state.updates[1].payload.updated_at).toBe('2026-01-01T00:00:01.000Z');
  });

  it('creates a new post, adopts its id and updates it afterwards', async () => {
    const { session, state } = harness();

    session.patchLexical(body('First words'));
    await session.dispatchExplicit();

    expect(state.creates).toHaveLength(1);
    expect(state.creates[0]).not.toHaveProperty('id');
    // A blank title persists as the default and its slug is generated from it.
    expect(state.creates[0]).toMatchObject({ title: '(Untitled)', slug: 'untitled' });
    expect(state.acquiredIds).toEqual(['created-id']);

    session.patchLexical(body('More words'));
    await session.dispatchExplicit();

    expect(state.updates[0].payload).toMatchObject({ id: 'created-id' });
    expect(state.acquiredIds).toEqual(['created-id']);
  });

  it('keeps the excerpt it was given and clears it back to null', async () => {
    const { session, state } = harness({ record: record() });

    session.patchExcerpt('A summary');
    await session.dispatchExplicit();
    session.patchExcerpt('');
    await session.dispatchExplicit();

    expect(state.updates[0].payload.custom_excerpt).toBe('A summary');
    expect(state.updates[1].payload.custom_excerpt).toBeNull();
  });

  it('gives each new post its own state', () => {
    const first = harness();
    const second = harness();

    first.session.patchLexical(body('Only mine'));

    expect(first.session.isDirty()).toBe(true);
    expect(second.session.isDirty()).toBe(false);
  });

  it('adopts a refetched record without re-baselining', () => {
    const { session } = harness({ record: record() });
    const edited = body('Unsaved edit');

    session.setBaseline(record().lexical);
    session.patchLexical(edited);
    session.recordRefetched(record({ updated_at: '2026-01-02T00:00:00.000Z' }));

    expect(session.isDirty()).toBe(true);
  });

  it('stops saving once disposed', async () => {
    const { session, state } = harness({ record: record() });

    session.patchLexical(body('Too late'));
    session.dispose();
    await session.dispatchExplicit();

    expect(state.updates).toHaveLength(0);
  });
});
