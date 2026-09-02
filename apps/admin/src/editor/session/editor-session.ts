import { createChangeTracker } from '@/editor/engine/change-tracker';
import { createSlugMachine } from '@/editor/engine/slug-machine';
import {
  DEFAULT_TITLE,
  createSaveEngine,
  type PersistedIdentity,
  type PostStatus,
  type SaveCompletion,
  type SaveEngineState,
  type SaveOutcome,
  type SaveRequest,
  type SaveResult,
} from '@/editor/engine/save-engine';
import type {
  EditablePostPatch,
  EditablePostProjection,
  RevisionProjection,
} from '@/editor/engine/change-tracker';
import type { LexicalInput } from '@/editor/engine/lexical-compare';
import type { PostWriteOptions } from '@tryghost/admin-x-framework/api/post-contract';
import { toSaveError } from './error-mapping';
import { createSlugPort } from './slug-port';
import { buildSaveSnapshot, type EditorSaveSnapshot } from './snapshot';
import { latestRevisionOf, newPostProjection, projectionOf, type EditorRecord } from './projection';

export type EditorWritePayload = Record<string, unknown>;

/** The full acknowledged record travels with the result so reconcile can rebase on it. */
export interface EditorSaveResult extends SaveResult {
  post: EditorRecord;
}

/** Fields the engine writes onto the request rather than reading from the live post. */
const AUTHORED_KEYS = ['title', 'slug'] as const;

type AuthoredFields = Pick<EditablePostProjection, (typeof AUTHORED_KEYS)[number]>;

export interface PreparedSave extends SaveRequest<EditorSaveSnapshot> {
  /** What the request submits, for the tracker's three-way rebase. */
  projection: EditablePostPatch;
  /** What the live post held for the authored fields when the request was built. */
  authoredFrom: AuthoredFields;
  payload: EditorWritePayload;
  options: PostWriteOptions;
  isCreate: boolean;
}

export interface EditorSessionTransport {
  create: (payload: EditorWritePayload) => Promise<EditorRecord | undefined>;
  update: (
    payload: EditorWritePayload,
    options: PostWriteOptions,
  ) => Promise<EditorRecord | undefined>;
  generateSlug: (text: string, postId: string | null) => Promise<string>;
}

export interface EditorSessionOptions {
  record?: EditorRecord;
  siteUrl?: string;
  saveFailureMessage: string;
  transport: EditorSessionTransport;
  /** Called once the create acknowledges; the caller replaces the URL. */
  onIdAcquired: (id: string) => void;
  onError: (error: unknown) => void;
}

export interface EditorSession {
  getState: () => SaveEngineState;
  subscribe: (listener: () => void) => () => void;
  isDirty: () => boolean;
  patchTitle: (title: string) => void;
  patchExcerpt: (excerpt: string) => void;
  patchFeatureImage: (
    patch: Partial<
      Pick<EditablePostProjection, 'feature_image' | 'feature_image_alt' | 'feature_image_caption'>
    >,
  ) => void;
  patchLexical: (lexical: unknown) => void;
  setBaseline: (lexical: LexicalInput) => void;
  baselineFailed: (error: unknown) => void;
  commitTitle: (title: string) => void;
  dispatchField: () => void;
  dispatchAutosave: () => void;
  dispatchExplicit: () => Promise<SaveCompletion>;
  recordRefetched: (record: EditorRecord) => void;
  reauthSucceeded: () => void;
  reauthAbandoned: () => void;
  dispose: () => void;
}

function isOlder(candidate: string, held: string | null): boolean {
  if (!held) {
    return false;
  }
  const candidateTime = Date.parse(candidate);
  const heldTime = Date.parse(held);
  return !Number.isNaN(candidateTime) && !Number.isNaN(heldTime) && candidateTime < heldTime;
}

/**
 * Composes the change tracker, slug machine and save engine into one editing
 * session: one per opened post, never shared between two new posts.
 */
export function createEditorSession({
  record,
  siteUrl,
  saveFailureMessage,
  transport,
  onIdAcquired,
  onError,
}: EditorSessionOptions): EditorSession {
  let identity: PersistedIdentity = record
    ? { id: record.id, updatedAt: record.updated_at ?? '' }
    : { id: null, updatedAt: null };
  let status: PostStatus = record?.status ?? 'draft';
  let publishedAt: string | null = record?.published_at ?? null;
  let live: EditablePostProjection = record ? projectionOf(record) : newPostProjection();
  let latestRevision: RevisionProjection | null = latestRevisionOf(record);
  let version = 0;

  const tracker = createChangeTracker({ siteUrl });
  tracker.load(identity.id, live);

  const machine = createSlugMachine({
    generateSlug: (text) => transport.generateSlug(text, identity.id),
    onListenerError: onError,
  });
  machine.loaded({ slug: live.slug, title: live.title });

  const slug = createSlugPort(machine);

  function patchLive(patch: EditablePostPatch): void {
    live = { ...live, ...patch };
    version += 1;
    tracker.setLive(identity.id, patch);
  }

  // The request carries a title and slug the writer never typed. The live post
  // adopts them, or the rebase keeps the superseded local value forever. This is
  // not an edit, so the version the request was built against must not move.
  function adoptAuthoredFields(prepared: PreparedSave): void {
    for (const key of AUTHORED_KEYS) {
      const authored = prepared.projection[key];
      const before = prepared.authoredFrom[key];
      if (authored === undefined || authored === before || live[key] !== before) {
        continue;
      }
      live = { ...live, [key]: authored };
      tracker.setLive(identity.id, { [key]: authored });
    }
  }

  function getSnapshot(): EditorSaveSnapshot {
    return buildSaveSnapshot({
      identity,
      status,
      publishedAt,
      title: live.title,
      slug: machine.getState().slug,
      slugIsCustom: machine.getState().mode === 'custom',
      verdict: tracker.verdict(),
      changedSinceLastRevision: tracker.hasChangedSinceRevision(latestRevision),
      version,
    });
  }

  function prepare(request: SaveRequest<EditorSaveSnapshot>): Promise<PreparedSave> {
    const isCreate = request.snapshot.id === null;
    // Tags are left out: nothing here edits them, and resending the set this
    // session opened with would overwrite tags changed elsewhere.
    const projection: EditablePostPatch = {
      title: request.title,
      slug: request.slug,
      lexical: live.lexical,
      custom_excerpt: live.custom_excerpt,
      feature_image: live.feature_image,
      feature_image_alt: live.feature_image_alt,
      feature_image_caption: live.feature_image_caption,
      updated_at: request.snapshot.updatedAt,
    };

    const payload: EditorWritePayload = {
      title: projection.title,
      slug: projection.slug,
      lexical: projection.lexical,
      custom_excerpt: projection.custom_excerpt,
      feature_image: projection.feature_image,
      feature_image_alt: projection.feature_image_alt,
      feature_image_caption: projection.feature_image_caption,
      status: request.target.status,
      published_at: request.target.publishedAt,
    };
    if (!isCreate) {
      payload.id = request.snapshot.id;
      // An empty token is not a token; sending one would fail the server's compare.
      if (projection.updated_at) {
        payload.updated_at = projection.updated_at;
      }
    }
    if (request.target.emailOnly !== undefined) {
      payload.email_only = request.target.emailOnly;
    }

    return Promise.resolve({
      ...request,
      projection,
      authoredFrom: { title: live.title, slug: live.slug },
      payload,
      options: {
        saveRevision: request.saveRevision,
        newsletter: request.target.newsletter,
        emailSegment: request.target.emailSegment,
      },
      isCreate,
    });
  }

  // No abort signal: the transport owns its own controller and takes none. A
  // response arriving after disposal is dropped by the engine instead.
  async function execute(prepared: PreparedSave): Promise<SaveOutcome<EditorSaveResult>> {
    try {
      const saved = prepared.isCreate
        ? await transport.create(prepared.payload)
        : await transport.update(prepared.payload, prepared.options);

      if (!saved) {
        return { ok: false, error: { kind: 'unknown', message: saveFailureMessage } };
      }

      return {
        ok: true,
        result: {
          id: saved.id,
          status: saved.status ?? 'draft',
          updatedAt: saved.updated_at ?? '',
          post: saved,
        },
      };
    } catch (error) {
      return { ok: false, error: toSaveError(error, saveFailureMessage) };
    }
  }

  function reconcile(prepared: PreparedSave, result: EditorSaveResult): void {
    adoptAuthoredFields(prepared);

    const acknowledged = projectionOf(result.post);
    tracker.saveAcknowledged(result.id, prepared.projection, acknowledged);

    const created = identity.id === null;
    identity = { id: result.id, updatedAt: result.updatedAt };
    status = result.status;
    publishedAt = result.post.published_at ?? null;
    latestRevision = latestRevisionOf(result.post);
    live = { ...live, slug: acknowledged.slug, updated_at: result.updatedAt };

    if (created) {
      onIdAcquired(result.id);
    }
  }

  const engine = createSaveEngine<EditorSaveSnapshot, PreparedSave, EditorSaveResult>({
    getSnapshot,
    slug: slug.port,
    prepare,
    execute,
    reconcile,
    onStateChange: (next) => {
      if (next.kind === 'error' || next.kind === 'conflict') {
        tracker.markSaveError(next.error.message);
      }
    },
    onListenerError: onError,
  });

  return {
    getState: () => engine.getState(),
    subscribe: (listener) => engine.subscribe(listener),
    isDirty: () => tracker.verdict().dirty,

    // A blank title persists as the default, so the live projection carries it
    // even while the input stays empty.
    patchTitle: (title) => patchLive({ title: title.trim() ? title : DEFAULT_TITLE }),
    patchExcerpt: (excerpt) => patchLive({ custom_excerpt: excerpt === '' ? null : excerpt }),
    patchFeatureImage: (patch) => patchLive(patch),
    patchLexical: (lexical) => patchLive({ lexical: JSON.stringify(lexical) }),
    setBaseline: (lexical) => tracker.setBaseline(identity.id, lexical),
    baselineFailed: (error) => tracker.baselineFailed(identity.id, error),

    // Only a draft's title drives the slug; a published URL must not move.
    commitTitle: (title) => {
      if (status === 'draft') {
        slug.commitTitle(title);
      }
    },
    dispatchField: () => void engine.dispatch('field'),
    dispatchAutosave: () => void engine.dispatch('autosave'),
    dispatchExplicit: () => engine.dispatch('explicit'),

    recordRefetched: (next) => {
      if (identity.id !== next.id) {
        return;
      }
      tracker.setSaved(next.id, projectionOf(next));
      const updatedAt = next.updated_at ?? '';
      if (isOlder(updatedAt, identity.updatedAt)) {
        return;
      }
      identity = { id: next.id, updatedAt };
      status = next.status ?? status;
      publishedAt = next.published_at ?? null;
      latestRevision = latestRevisionOf(next);
    },

    reauthSucceeded: () => engine.reauthSucceeded(),
    reauthAbandoned: () => engine.reauthAbandoned(),

    dispose: () => {
      engine.dispose();
      tracker.dispose();
    },
  };
}
