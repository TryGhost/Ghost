import { createChangeTracker, sameFieldValue } from '@/editor/engine/change-tracker';
import { createSlugMachine } from '@/editor/engine/slug-machine';
import {
  DEFAULT_TITLE,
  createSaveEngine,
  isCollisionToken,
  zeroMilliseconds,
  type LeaveDecision,
  type PersistedIdentity,
  type PostStatus,
  type PublishOptions,
  type SaveCompletion,
  type ScheduleOptions,
  type SaveEngineState,
  type SaveOutcome,
  type SaveRequest,
  type SaveResult,
} from '@/editor/engine/save-engine';
import type {
  EditablePostPatch,
  EditablePostProjection,
  RestoredRevision,
  RevisionProjection,
} from '@/editor/engine/change-tracker';
import type { LexicalInput } from '@/editor/engine/lexical-compare';
import type { PostWriteOptions } from '@tryghost/admin-x-framework/api/post-contract';
import { toSaveError } from './error-mapping';
import { createSlugPort } from './slug-port';
import { buildSaveSnapshot, type EditorSaveSnapshot } from './snapshot';
import { latestRevisionOf, newPostProjection, projectionOf, type EditorRecord } from './projection';
import {
  AUTHORS_REQUIRED,
  PUBLISHED_AT_MUST_BE_PAST,
  SETTINGS_FIELD_KEYS,
  identityFor,
  publishedAtInFuture,
  settingsFieldError,
  validatedFieldsOf,
  type EditorSettingsPatch,
  type EditorSettingsFields,
  type SettingsFieldKey,
  type ValidatedSettingsFields,
} from './settings-fields';

export type EditorWritePayload = Record<string, unknown>;

/** What a manual slug edit did, so the input can revert and report a failure. */
type SlugEditOutcome = 'applied' | 'unchanged' | 'failed';

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
  /** Field values captured for validation of this request. */
  validated: ValidatedSettingsFields;
  /** The edit version the request was built at, for the settings adoption guard. */
  builtAtVersion: number;
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
  /** Authors the create. Core rejects an Author's or Contributor's create without it. */
  currentUserId?: string;
  saveFailureMessage: string;
  transport: EditorSessionTransport;
  /** Called once the create acknowledges; the caller replaces the URL. */
  onIdAcquired: (id: string) => void;
  onError: (error: unknown) => void;
}

/** The state React renders, published together after a session change. */
export interface EditorSessionView {
  readonly state: SaveEngineState;
  readonly isDirty: boolean;
  readonly slug: string;
  readonly settings: EditorSettingsFields;
  readonly publishTime: { status: PostStatus; publishedAt: string | null };
}

export interface EditorSession {
  getState: () => SaveEngineState;
  /** A stable snapshot until one of the rendered values changes. */
  getView: () => EditorSessionView;
  /** Notified after engine, dirtiness, slug, settings or publish-time changes. */
  subscribe: (listener: () => void) => () => void;
  getSaveSnapshot: () => EditorSaveSnapshot;
  isDirty: () => boolean;
  /** Dirty for a reason other than the failed save itself: work a reload would discard. */
  hasUnsavedContent: () => boolean;
  patchTitle: (title: string) => void;
  patchExcerpt: (excerpt: string) => void;
  patchFeatureImage: (
    patch: Partial<
      Pick<EditablePostProjection, 'feature_image' | 'feature_image_alt' | 'feature_image_caption'>
    >,
  ) => void;
  /** Stages settings-sidebar fields; outstanding changes enter the next save payload. */
  patchFields: (patch: EditorSettingsPatch) => void;
  /** The live value of every settings field, for the sidebar's inputs. */
  getFields: () => EditablePostProjection;
  /**
   * Stages the publish time. It is the save engine's command target rather than
   * a settings field, so it has its own writer instead of `patchFields`.
   */
  editPublishedAt: (publishedAt: string) => void;
  /** The publish time the writer is looking at, staged edit included. */
  getPublishedAt: () => string | null;
  /** The one save policy gate for settings fields; see the README. */
  commitField: () => void;
  /** The slug the machine holds, which a title commit moves without a field patch. */
  getSlug: () => string;
  /** Routes a manual slug edit through the slug machine, then the same save policy. */
  editSlug: (input: string) => Promise<SlugEditOutcome>;
  patchLexical: (lexical: unknown) => void;
  /** Writes a revision's fields into the post and saves them; true once persisted. */
  restoreRevision: (restored: RestoredRevision) => Promise<boolean>;
  setBaseline: (lexical: LexicalInput) => void;
  baselineFailed: (error: unknown) => void;
  commitTitle: (title: string) => void;
  dispatchField: () => void;
  dispatchAutosave: () => void;
  dispatchExplicit: () => Promise<SaveCompletion>;
  dispatchPublish: (options?: PublishOptions) => Promise<SaveCompletion>;
  dispatchSchedule: (options: ScheduleOptions) => Promise<SaveCompletion>;
  dispatchRevert: () => Promise<SaveCompletion>;
  getLiveLexical: () => string | null;
  recordRefetched: (record: EditorRecord) => boolean;
  /** Replaces the whole document when the server copy safely advances this session. */
  recordReloaded: (record: EditorRecord) => boolean;
  reauthSucceeded: () => void;
  reauthAbandoned: () => void;
  leaveRequested: () => Promise<LeaveDecision>;
  dispose: () => void;
}

/**
 * Whether two publish times name the same minute. The fields commit at minute
 * granularity, so the seconds a save stamped are not a difference the writer made.
 */
function sameMinute(left: string | null, right: string | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }
  const a = Date.parse(left);
  const b = Date.parse(right);
  return !Number.isNaN(a) && !Number.isNaN(b) && Math.floor(a / 60000) === Math.floor(b / 60000);
}

/** Whether a record's collision token predates the one already held. */
export function isOlderToken(candidate: string, held: string | null): boolean {
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
  currentUserId,
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
  // Retain the writer's choice through older saves, even when it matches a refetch.
  let stagedPublishedAt: string | null = null;
  let publishedAtEditedAt = 0;
  let live: EditablePostProjection = record
    ? projectionOf(record)
    : newPostProjection(currentUserId);
  let latestRevision: RevisionProjection | null = latestRevisionOf(record);
  let version = 0;
  let disposed = false;
  // A proposal is unsaved work before it becomes a sanitized document field.
  const pendingSlugEdits = new Set<symbol>();
  // The version each settings field was last edited at by the writer. Adopting
  // is not an edit, so a snapshot of the live values could not answer this.
  const writerEdits = new Map<SettingsFieldKey, number>();
  // The version the in-flight request was built at, or null when none is.
  let inFlightSince: number | null = null;

  function livePublishedAt(): string | null {
    return stagedPublishedAt ?? publishedAt;
  }

  function releaseSavedPublishTime(): void {
    if (
      sameMinute(stagedPublishedAt, publishedAt) &&
      (inFlightSince === null || publishedAtEditedAt <= inFlightSince)
    ) {
      stagedPublishedAt = null;
    }
  }

  const tracker = createChangeTracker({ siteUrl });
  tracker.load(identity.id, live);

  const machine = createSlugMachine({
    generateSlug: (text) => transport.generateSlug(text, identity.id),
    onListenerError: onError,
  });
  machine.loaded({ slug: live.slug, title: live.title });

  const slug = createSlugPort(machine);

  const changeListeners = new Set<() => void>();
  let view: EditorSessionView;

  function notifyChanged(): void {
    if (disposed) {
      return;
    }
    const state = engine.getState();
    const isDirty = getSnapshot().isDirty;
    const currentSlug = machine.getState().slug;
    const currentPublishedAt = livePublishedAt();
    const settings =
      view && SETTINGS_FIELD_KEYS.every((key) => view.settings[key] === live[key])
        ? view.settings
        : (Object.fromEntries(
            SETTINGS_FIELD_KEYS.map((key) => [key, live[key]]),
          ) as EditorSettingsFields);
    const publishTime =
      view &&
      view.publishTime.status === status &&
      view.publishTime.publishedAt === currentPublishedAt
        ? view.publishTime
        : { status, publishedAt: currentPublishedAt };

    // Body edits need no new React snapshot while the rendered values stay the
    // same. Keep nested settings and time references stable across engine events.
    if (
      view &&
      view.state === state &&
      view.isDirty === isDirty &&
      view.slug === currentSlug &&
      view.settings === settings &&
      view.publishTime === publishTime
    ) {
      return;
    }
    view = { state, isDirty, slug: currentSlug, settings, publishTime };
    for (const listener of changeListeners) {
      try {
        listener();
      } catch (error) {
        onError(error);
      }
    }
  }

  function patchLive(patch: EditablePostPatch): void {
    const before = live;
    live = { ...live, ...patch };
    version += 1;
    for (const key of SETTINGS_FIELD_KEYS) {
      // Re-emitting a value the field already holds is not an edit, and a
      // relation re-emitted as a fresh array holds the same value.
      if (patch[key] !== undefined && !sameFieldValue(key, before[key], patch[key])) {
        writerEdits.set(key, version);
      }
    }
    tracker.setLive(identity.id, patch);
    notifyChanged();
  }

  // A save writes a title and slug the writer never typed: the request's own
  // default title and generated slug, then whatever the server normalized them
  // to. The live document adopts those, or the rebase keeps the superseded local
  // value forever -- but only where the writer has not moved past them, which is
  // the same rule the rebase applies. Adopting is not an edit, so the version the
  // request was built against must not move.
  function adoptWhereUnchanged(before: AuthoredFields, next: Partial<AuthoredFields>): void {
    for (const key of AUTHORED_KEYS) {
      const value = next[key];
      if (value === undefined || value === before[key] || live[key] !== before[key]) {
        continue;
      }
      live = { ...live, [key]: value };
      tracker.setLive(identity.id, { [key]: value });
    }
  }

  // The one rule both adoption paths ask, so a refetch and an acknowledgement
  // cannot disagree about who owns a field.
  function isAdoptable(key: SettingsFieldKey): boolean {
    if (tracker.isFieldDirty(key)) {
      return false;
    }
    return inFlightSince === null || (writerEdits.get(key) ?? 0) <= inFlightSince;
  }

  // The server's copy of a settings field the writer has not moved past wins,
  // the same rule the authored fields use: without it a value the server
  // normalized or someone else changed reads as a local edit for good.
  function adoptSettings(
    next: EditablePostProjection,
    adoptable: (key: SettingsFieldKey) => boolean,
  ): void {
    const patch: Record<string, unknown> = {};
    for (const key of SETTINGS_FIELD_KEYS) {
      if (adoptable(key) && live[key] !== next[key]) {
        patch[key] = next[key];
      }
    }
    if (Object.keys(patch).length === 0) {
      return;
    }
    live = { ...live, ...patch };
    tracker.setLive(identity.id, patch);
  }

  /** The writer removed every author the post had; Ember's validator refuses it too. */
  function authorsEmptied(): boolean {
    return live.authors.length === 0 && tracker.isFieldDirty('authors');
  }

  function getSnapshot(): EditorSaveSnapshot {
    const verdict = tracker.verdict();
    return buildSaveSnapshot({
      identity,
      status,
      publishedAt: livePublishedAt(),
      publishedAtDirty: stagedPublishedAt !== null,
      title: live.title,
      slug: machine.getState().slug,
      slugIsCustom: machine.getState().mode === 'custom',
      verdict: { ...verdict, dirty: verdict.dirty || pendingSlugEdits.size > 0 },
      changedSinceLastRevision: tracker.hasChangedSinceRevision(latestRevision),
      version,
    });
  }

  // A title commit and a load move the machine's slug without a field patch, so
  // the URL input hears about them through the session's own subscribers.
  const stopSlugNotifications = machine.subscribe(notifyChanged);

  function prepare(request: SaveRequest<EditorSaveSnapshot>): Promise<PreparedSave> {
    const isCreate = request.snapshot.id === null;
    const projection: EditablePostPatch = {
      title: request.title,
      slug: request.slug,
      lexical: live.lexical,
      feature_image: live.feature_image,
      feature_image_alt: live.feature_image_alt,
      feature_image_caption: live.feature_image_caption,
      updated_at: request.snapshot.updatedAt,
    };

    const payload: EditorWritePayload = {
      title: projection.title,
      slug: projection.slug,
      lexical: projection.lexical,
      feature_image: projection.feature_image,
      feature_image_alt: projection.feature_image_alt,
      feature_image_caption: projection.feature_image_caption,
      status: request.target.status,
      published_at: request.target.publishedAt,
    };
    // An Author's or Contributor's create is refused unless `authors` names them
    // (core/server/models/relations/authors.js). Updates never resend it.
    if (isCreate && currentUserId) {
      payload.authors = [{ id: currentUserId }];
    }

    const staged = projection as Record<string, unknown>;
    for (const key of SETTINGS_FIELD_KEYS) {
      if (tracker.isFieldDirty(key)) {
        staged[key] = live[key];
        payload[key] = identityFor(key, live[key]);
      }
    }
    // The write contract requires the pair even when only one field changed.
    // Reads include tier relations for Public and Paid posts too, so switching
    // to specific tiers can leave the relation IDs unchanged.
    if (live.visibility === 'tiers' && ('visibility' in payload || 'tiers' in payload)) {
      projection.visibility = live.visibility;
      payload.visibility = live.visibility;
      projection.tiers = live.tiers;
      payload.tiers = live.tiers;
    }
    if (!isCreate) {
      if (!projection.updated_at) {
        // Without the token the server skips its collision check entirely and the
        // save would overwrite whatever landed in the meantime.
        return Promise.reject(
          new Error('Cannot save without the version this post was loaded at.'),
        );
      }
      payload.id = request.snapshot.id;
      payload.updated_at = projection.updated_at;
    }
    if (request.target.emailOnly !== undefined) {
      payload.email_only = request.target.emailOnly;
    }

    return Promise.resolve({
      ...request,
      projection,
      authoredFrom: { title: live.title, slug: live.slug },
      validated: validatedFieldsOf(live),
      builtAtVersion: version,
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
    // The post validator runs before every save: an explicit tier selection
    // needs a tier even on the first save, and an over-long field is not sent.
    const invalid = settingsFieldError(prepared.validated);
    if (invalid) {
      return { ok: false, error: { kind: 'validation', message: invalid } };
    }
    // A status command with no time of its own carries whatever the sidebar
    // staged; Core validates the publish time for scheduled posts only.
    if (
      prepared.target.publishedAt !== publishedAt &&
      publishedAtInFuture(prepared.target.status, prepared.target.publishedAt)
    ) {
      return { ok: false, error: { kind: 'validation', message: PUBLISHED_AT_MUST_BE_PAST } };
    }
    // Only an emptied list reaches the request; an untouched create is credited
    // to the current user by `prepare` instead.
    if (prepared.projection.authors?.length === 0) {
      return { ok: false, error: { kind: 'validation', message: AUTHORS_REQUIRED } };
    }

    inFlightSince = prepared.builtAtVersion;
    try {
      const saved = prepared.isCreate
        ? await transport.create(prepared.payload)
        : await transport.update(prepared.payload, prepared.options);

      if (!saved) {
        inFlightSince = null;
        releaseSavedPublishTime();
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
      inFlightSince = null;
      releaseSavedPublishTime();
      return { ok: false, error: toSaveError(error, saveFailureMessage) };
    }
  }

  function reconcile(prepared: PreparedSave, result: EditorSaveResult): void {
    const submitted: AuthoredFields = {
      title: prepared.projection.title ?? prepared.authoredFrom.title,
      slug: prepared.projection.slug ?? prepared.authoredFrom.slug,
    };
    adoptWhereUnchanged(prepared.authoredFrom, submitted);

    // A matching refetch can make an unsubmitted edit look saved. Preserve
    // those edits through the rebase, whose fallback base is the latest saved
    // copy. Submitted fields already have a stable base in the request.
    const unsubmittedEdits = Object.fromEntries(
      SETTINGS_FIELD_KEYS.filter(
        (key) =>
          prepared.projection[key] === undefined &&
          (writerEdits.get(key) ?? 0) > prepared.builtAtVersion,
      ).map((key) => [key, live[key]]),
    );
    const acknowledged = projectionOf(result.post);
    tracker.saveAcknowledged(result.id, prepared.projection, acknowledged);
    tracker.setLive(result.id, unsubmittedEdits);
    adoptWhereUnchanged(submitted, { title: acknowledged.title, slug: acknowledged.slug });
    // The tracker now holds the retained edits as well as the rebase, so its
    // compare can decide adoption after the request's window closes.
    inFlightSince = null;
    adoptSettings(acknowledged, isAdoptable);
    machine.saveAcknowledged(submitted, {
      title: acknowledged.title,
      slug: acknowledged.slug,
    });

    const created = identity.id === null;
    identity = { id: result.id, updatedAt: result.updatedAt };
    status = result.status;
    publishedAt = result.post.published_at ?? null;
    if (publishedAtEditedAt <= prepared.builtAtVersion) {
      stagedPublishedAt = null;
    }
    releaseSavedPublishTime();
    latestRevision = latestRevisionOf(result.post);
    live = { ...live, updated_at: result.updatedAt };

    if (created) {
      onIdAcquired(result.id);
    }
    notifyChanged();
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
      // A save error also moves dirtiness without going through a field patch.
      notifyChanged();
    },
    onListenerError: onError,
  });

  // Seed the external-store snapshot before the session is handed to React.
  notifyChanged();

  // The one place the sidebar's save policy lives. A draft persists a settings
  // field the way the body does; every other status stages it until Update.
  function commitField(): void {
    // Invalid settings stay staged rather than dispatching a field save.
    if (
      status !== 'draft' ||
      settingsFieldError(validatedFieldsOf(live)) ||
      authorsEmptied() ||
      publishedAtInFuture(status, livePublishedAt())
    ) {
      return;
    }
    void engine.dispatch('field');
  }

  // An `unchanged` proposal means the machine kept the slug it already had. A
  // rejected or blank generator answer lost the writer's edit, so it reports.
  async function editSlug(input: string): Promise<SlugEditOutcome> {
    if (disposed) {
      return 'unchanged';
    }
    const edit = Symbol();
    pendingSlugEdits.add(edit);
    // Register the request before notifying listeners that may save or leave.
    const submission = slug.editSlug(input);
    notifyChanged();
    try {
      const proposal = await submission;
      if (disposed || !pendingSlugEdits.has(edit)) {
        return 'unchanged';
      }
      if (proposal.source === 'unchanged') {
        if (proposal.reason === 'error') {
          onError(proposal.error);
          return 'failed';
        }
        if (proposal.reason === 'empty-result') {
          return 'failed';
        }
        return 'unchanged';
      }
      patchLive({ slug: proposal.slug });
      commitField();
      return 'applied';
    } finally {
      pendingSlugEdits.delete(edit);
      if (!disposed) {
        notifyChanged();
      }
    }
  }

  return {
    getState: () => engine.getState(),
    getView: () => view,
    subscribe: (listener) => {
      changeListeners.add(listener);
      return () => {
        changeListeners.delete(listener);
      };
    },
    getSaveSnapshot: getSnapshot,
    isDirty: () => getSnapshot().isDirty,
    hasUnsavedContent: () =>
      stagedPublishedAt !== null ||
      pendingSlugEdits.size > 0 ||
      tracker.verdict().reasons.some((reason) => reason.code !== 'POST_HAS_ERROR'),

    // A blank title persists as the default, so the live projection carries it
    // even while the input stays empty.
    patchTitle: (title) => patchLive({ title: title.trim() ? title : DEFAULT_TITLE }),
    patchExcerpt: (excerpt) => patchLive({ custom_excerpt: excerpt === '' ? null : excerpt }),
    patchFeatureImage: (patch) => patchLive(patch),

    patchFields: patchLive,
    getFields: () => live,

    commitField,
    getSlug: () => machine.getState().slug,
    editSlug,

    // Staged rather than patched: the engine reads the publish time off the
    // snapshot, so a status command's own target still wins over this.
    editPublishedAt: (next) => {
      if (sameMinute(next, livePublishedAt())) {
        return;
      }
      // The saved seconds are kept when the chosen minute is the one already
      // saved. An undo still needs its value until an older save has settled.
      stagedPublishedAt = sameMinute(next, publishedAt) ? publishedAt : zeroMilliseconds(next);
      version += 1;
      publishedAtEditedAt = version;
      releaseSavedPublishTime();
      notifyChanged();
    },
    getPublishedAt: livePublishedAt,
    patchLexical: (lexical) => patchLive({ lexical: JSON.stringify(lexical) }),

    restoreRevision: async (restored) => {
      if (disposed || restored.lexical === null || engine.getState().kind === 'reauth-pending') {
        return false;
      }
      // A blank title persists as the default, the same as one the writer types.
      const revision: RestoredRevision = {
        ...restored,
        title: restored.title.trim() ? restored.title : DEFAULT_TITLE,
      };
      const previous: RestoredRevision = {
        lexical: live.lexical,
        title: live.title,
        custom_excerpt: live.custom_excerpt,
        feature_image: live.feature_image,
        feature_image_alt: live.feature_image_alt,
        feature_image_caption: live.feature_image_caption,
      };

      patchLive(revision);
      // Ember's slug task bails once the post carries the revision's title, so a
      // restore leaves the URL alone.
      slug.titleReplaced(revision.title);

      // The reauth controls are behind the history modal. Fail and roll back
      // this restore instead of leaving it frozen with no accessible way out.
      const stop = engine.subscribe(() => {
        if (engine.getState().kind === 'reauth-pending') {
          engine.reauthAbandoned();
        }
      });
      const completion = await engine.dispatch('explicit').finally(stop);
      if (completion.kind !== 'saved') {
        // The editor surface never adopted the revision, so nothing may keep it.
        patchLive(previous);
        slug.titleReplaced(previous.title);
        return false;
      }
      tracker.revisionRestored(identity.id, revision);
      notifyChanged();
      return true;
    },

    setBaseline: (lexical) => {
      tracker.setBaseline(identity.id, lexical);
      notifyChanged();
    },
    baselineFailed: (error) => {
      tracker.baselineFailed(identity.id, error);
      notifyChanged();
    },

    // Only a draft's title drives the slug; a published URL must not move.
    commitTitle: (title) => {
      if (status === 'draft') {
        slug.commitTitle(title);
      }
    },
    dispatchField: () => void engine.dispatch('field'),
    dispatchAutosave: () => void engine.dispatch('autosave'),
    dispatchExplicit: () => engine.dispatch('explicit'),
    dispatchPublish: (options) => engine.dispatch('publish', options),
    dispatchSchedule: (options) => engine.dispatch('schedule', options),
    dispatchRevert: () => engine.dispatch('revert'),
    getLiveLexical: () => live.lexical,

    recordRefetched: (next) => {
      const updatedAt = next.updated_at ?? '';
      if (
        disposed ||
        identity.id !== next.id ||
        !isCollisionToken(updatedAt) ||
        isOlderToken(updatedAt, identity.updatedAt)
      ) {
        return false;
      }
      // Decide against the old saved copy before the refetch replaces it.
      const adoptable = new Set(SETTINGS_FIELD_KEYS.filter(isAdoptable));
      const projection = projectionOf(next);
      tracker.setSaved(next.id, projection);
      adoptSettings(projection, (key) => adoptable.has(key));
      identity = { id: next.id, updatedAt };
      status = next.status ?? status;
      publishedAt = next.published_at ?? null;
      releaseSavedPublishTime();
      latestRevision = latestRevisionOf(next);
      notifyChanged();
      return true;
    },

    // A document boundary, not a refetch: the tracker reloads, so the baseline
    // the hidden instance reported for the old document is discarded with it.
    recordReloaded: (next) => {
      // The read outlives a session the writer navigated away from.
      const updatedAt = next.updated_at ?? '';
      if (
        disposed ||
        identity.id !== next.id ||
        !isCollisionToken(updatedAt) ||
        isOlderToken(updatedAt, identity.updatedAt)
      ) {
        return false;
      }
      if (engine.getState().kind !== 'conflict' || !engine.contentReloaded(updatedAt)) {
        return false;
      }
      identity = { id: next.id, updatedAt };
      status = next.status ?? 'draft';
      publishedAt = next.published_at ?? null;
      latestRevision = latestRevisionOf(next);
      live = projectionOf(next);
      stagedPublishedAt = null;
      publishedAtEditedAt = 0;
      pendingSlugEdits.clear();
      writerEdits.clear();
      inFlightSince = null;
      version += 1;
      tracker.load(identity.id, live);
      machine.loaded({ slug: live.slug, title: live.title });
      slug.reset();
      notifyChanged();
      return true;
    },

    reauthSucceeded: () => engine.reauthSucceeded(),
    reauthAbandoned: () => engine.reauthAbandoned(),
    leaveRequested: () => engine.leaveRequested(),

    dispose: () => {
      disposed = true;
      pendingSlugEdits.clear();
      stopSlugNotifications();
      slug.reset();
      engine.dispose();
      tracker.dispose();
      changeListeners.clear();
    },
  };
}
