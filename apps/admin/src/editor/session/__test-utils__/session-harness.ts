import { vi } from 'vitest';
import { serializePostPayload } from '@tryghost/admin-x-framework/api/post-contract';
import { JSONError } from '@tryghost/admin-x-framework/errors';
import { slugify } from '@tryghost/string';
import { buildLexicalParagraph } from '@tryghost/test-data';
import {
  createEditorSession,
  type EditorCreatePayload,
  type EditorEditPayload,
  type EditorSessionOptions,
} from '@/editor/session/editor-session';
import type { EditorRecord } from '@/editor/session/projection';

export const LOADED_AT = '2026-01-01T00:00:00.000Z';

export function body(text: string): unknown {
  return JSON.parse(buildLexicalParagraph(text));
}

export function record(overrides: Partial<EditorRecord> = {}): EditorRecord {
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

export function updateCollision(): JSONError {
  return new JSONError(new Response(null, { status: 409 }), {
    errors: [
      {
        code: 'UPDATE_COLLISION',
        context: null,
        details: null,
        ghostErrorCode: null,
        help: '',
        id: 'id',
        message: 'Saving failed! Someone else is editing this post.',
        property: null,
        type: 'UpdateCollisionError',
      },
    ],
  });
}

/**
 * The post serializer standing in for the transport: a payload is not a record,
 * so this resolves it into the fields a saved record carries.
 */
export function serializedFields(payload: EditorCreatePayload): Partial<EditorRecord> {
  return serializePostPayload(payload);
}

export interface HarnessState {
  updates: Array<{ payload: EditorEditPayload; saveRevision?: boolean }>;
  creates: EditorCreatePayload[];
  acquiredIds: string[];
  /** The record every acknowledgement answers with; tests advance it. */
  acknowledged: EditorRecord;
}

export interface HarnessHooks {
  duringSave?: () => void;
  acknowledge?: (record: EditorRecord, saveCount: number) => EditorRecord;
  /** Answers an update with nothing, which the session reports as a failed save. */
  failSave?: (saveCount: number) => boolean;
  failUpdateWith?: Error;
  failSlugWith?: Error;
  /** Replaces the generator, so a test can hold a slug request open. */
  generateSlug?: (text: string) => Promise<string>;
  /** Resolves a payload into the fields the acknowledgement carries back. */
  applied?: (payload: EditorCreatePayload, acknowledged: EditorRecord) => Partial<EditorRecord>;
}

export interface HarnessOptions extends Partial<EditorSessionOptions> {
  /** The record acknowledgements build on, when it differs from the loaded one. */
  acknowledged?: EditorRecord;
  /** The id a create hands back. */
  createdId?: string;
  /** Baselined after construction, as a loaded editor would. */
  baseline?: string | null;
}

export function sessionHarness(options: HarnessOptions = {}, hooks: HarnessHooks = {}) {
  const { acknowledged, createdId = 'created-id', baseline, ...sessionOptions } = options;
  const state: HarnessState = {
    updates: [],
    creates: [],
    acquiredIds: [],
    acknowledged: acknowledged ?? record(),
  };
  let saveCount = 0;

  const create = vi.fn((payload: EditorCreatePayload) => {
    state.creates.push(payload);
    hooks.duringSave?.();
    saveCount += 1;
    const next = {
      ...state.acknowledged,
      id: createdId,
      ...(hooks.applied?.(payload, state.acknowledged) ?? {
        title: payload.title,
        slug: payload.slug,
        lexical: payload.lexical,
      }),
      updated_at: `2026-01-01T00:00:0${saveCount}.000Z`,
    } as EditorRecord;
    state.acknowledged = hooks.acknowledge?.(next, saveCount) ?? next;
    return Promise.resolve(state.acknowledged);
  });

  const update = vi.fn(
    (
      payload: EditorEditPayload,
      writeOptions?: { saveRevision?: boolean },
    ): Promise<EditorRecord | undefined> => {
      state.updates.push({ payload, saveRevision: writeOptions?.saveRevision });
      hooks.duringSave?.();
      if (hooks.failUpdateWith) {
        return Promise.reject(hooks.failUpdateWith);
      }
      saveCount += 1;
      if (hooks.failSave?.(saveCount)) {
        return Promise.resolve(undefined);
      }
      const next = {
        ...state.acknowledged,
        ...(hooks.applied?.(payload, state.acknowledged) ?? {
          title: payload.title,
          slug: payload.slug,
          lexical: payload.lexical,
          custom_excerpt: ('custom_excerpt' in payload
            ? payload.custom_excerpt
            : (state.acknowledged.custom_excerpt ?? null)) as string | null,
          featured: ('featured' in payload
            ? payload.featured
            : state.acknowledged.featured) as boolean,
        }),
        updated_at: `2026-01-01T00:00:0${saveCount}.000Z`,
      } as EditorRecord;
      state.acknowledged = hooks.acknowledge?.(next, saveCount) ?? next;
      return Promise.resolve(state.acknowledged);
    },
  );

  const session = createEditorSession({
    saveFailureMessage: 'Couldn’t save this post.',
    onIdAcquired: (id) => state.acquiredIds.push(id),
    onError: vi.fn(),
    transport: {
      create,
      update,
      generateSlug: (text) => {
        if (hooks.generateSlug) {
          return hooks.generateSlug(text);
        }
        return hooks.failSlugWith
          ? Promise.reject(hooks.failSlugWith)
          : Promise.resolve(slugify(text));
      },
    },
    ...sessionOptions,
  });

  if ('baseline' in options) {
    session.setBaseline(baseline ?? null);
  }

  return { session, state, create, update };
}
