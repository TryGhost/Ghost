import { describe, expect, it } from 'vitest';
import { OLD_SCHEMA_CORPUS } from '@/editor/engine/__fixtures__';
import {
  createChangeTracker,
  type EditablePostProjection,
  type PostId,
} from '@/editor/engine/change-tracker';
import {
  lexicalEquals,
  stripDirection,
  type LexicalDocument,
} from '@/editor/engine/lexical-compare';

const textNode = (text: string) => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text,
  type: 'extended-text',
  version: 1,
});

const paragraph = (text: string, direction: string | null = null) => ({
  children: [textNode(text)],
  direction,
  format: '',
  indent: 0,
  type: 'paragraph',
  version: 1,
});

const doc = (children: unknown[], direction: string | null = null): LexicalDocument => ({
  root: { children, direction, format: '', indent: 0, type: 'root', version: 1 },
});

const serialize = (document: LexicalDocument) => JSON.stringify(document);

function appendParagraph(document: LexicalDocument, text: string): LexicalDocument {
  const copy = JSON.parse(JSON.stringify(document)) as { root: { children: unknown[] } };
  copy.root.children.push(paragraph(text));
  return copy;
}

function withLtrEverywhere(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withLtrEverywhere);
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = key === 'direction' ? 'ltr' : withLtrEverywhere(child);
    }
    return out;
  }
  return value;
}

const SAVED_DOC = doc([paragraph('Hello')]);
const BLANK_DOC = doc([{ ...paragraph(''), children: [] }]);
const POST_ID = 'post-1';
const T0 = '2026-09-01T10:00:00.000Z';
const T1 = '2026-09-01T10:01:00.000Z';
const T2 = '2026-09-01T10:02:00.000Z';

function post(overrides: Partial<EditablePostProjection> = {}): EditablePostProjection {
  return {
    title: 'Title',
    slug: 'title',
    lexical: serialize(SAVED_DOC),
    tags: [{ name: 'News' }],
    custom_excerpt: null,
    feature_image: null,
    feature_image_alt: null,
    feature_image_caption: null,
    updated_at: T0,
    ...overrides,
  };
}

function loadedTracker(saved: EditablePostProjection = post(), id: PostId = POST_ID) {
  const tracker = createChangeTracker();
  tracker.load(id, saved);
  tracker.setBaseline(id, saved.lexical);
  tracker.setLive(id, { lexical: saved.lexical });
  return tracker;
}

const codes = (tracker: ReturnType<typeof createChangeTracker>) =>
  tracker.verdict().reasons.map((r) => r.code);

describe('createChangeTracker', () => {
  it('is clean before a post is loaded', () => {
    expect(createChangeTracker().verdict()).toEqual({ dirty: false, reasons: [] });
  });

  it('is clean right after load, before the editors report', () => {
    const tracker = createChangeTracker();
    tracker.load(POST_ID, post());

    expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
  });

  describe('invariant 5: loading old-schema content is clean until the user edits', () => {
    it.each(OLD_SCHEMA_CORPUS)('$name ($provenance)', ({ before, after }) => {
      const tracker = createChangeTracker();
      tracker.load(POST_ID, post({ lexical: serialize(before) }));
      tracker.setBaseline(POST_ID, serialize(after));
      tracker.setLive(POST_ID, { lexical: serialize(after) });

      expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
    });

    it.each(OLD_SCHEMA_CORPUS)('$name: a user edit after load is dirty', ({ before, after }) => {
      const tracker = createChangeTracker();
      tracker.load(POST_ID, post({ lexical: serialize(before) }));
      tracker.setBaseline(POST_ID, serialize(after));
      tracker.setLive(POST_ID, { lexical: serialize(appendParagraph(after, 'User typed this')) });

      expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);
    });

    it.each(OLD_SCHEMA_CORPUS)(
      '$name: direction inferred at depth by a mounted editor is ignored',
      ({ before, after }) => {
        const tracker = createChangeTracker();
        tracker.load(POST_ID, post({ lexical: serialize(before) }));
        tracker.setBaseline(POST_ID, serialize(after));
        tracker.setLive(POST_ID, {
          lexical: serialize(withLtrEverywhere(after) as LexicalDocument),
        });

        expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
      },
    );

    it.each(OLD_SCHEMA_CORPUS)(
      '$name: a refetch of the saved post after load stays clean',
      ({ before, after }) => {
        const tracker = createChangeTracker();
        tracker.load(POST_ID, post({ lexical: serialize(before) }));
        tracker.setBaseline(POST_ID, serialize(after));
        tracker.setLive(POST_ID, { lexical: serialize(after) });

        tracker.setSaved(POST_ID, post({ lexical: serialize(before) }));
        expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
      },
    );

    it.each(OLD_SCHEMA_CORPUS)(
      '$name: the transformed live state is dirty only until the baseline reports',
      ({ before, after }) => {
        const tracker = createChangeTracker();
        tracker.load(POST_ID, post({ lexical: serialize(before) }));
        tracker.setLive(POST_ID, { lexical: serialize(after) });
        const transformed = !lexicalEquals(before, after);
        expect(codes(tracker)).toEqual(transformed ? ['BASELINE_PENDING'] : []);

        tracker.setBaseline(POST_ID, serialize(after));
        expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
      },
    );
  });

  describe('lexical divergence', () => {
    it('requires divergence from both the saved and the baseline state', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { lexical: serialize(appendParagraph(SAVED_DOC, 'Edit')) });
      expect(tracker.verdict().dirty).toBe(true);

      tracker.setLive(POST_ID, { lexical: serialize(SAVED_DOC) });
      expect(tracker.verdict().dirty).toBe(false);
    });

    it('is dirty for a new post without saved content once the user types', () => {
      const tracker = createChangeTracker();
      tracker.load(null, post({ lexical: null }));
      tracker.setBaseline(null, serialize(BLANK_DOC));
      tracker.setLive(null, { lexical: serialize(BLANK_DOC) });
      expect(tracker.verdict().dirty).toBe(false);

      tracker.setLive(null, { lexical: serialize(doc([paragraph('Typed')])) });
      expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);
    });

    it('fails closed when the lexical state cannot be parsed', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { lexical: '{not json' });

      expect(tracker.verdict().reasons).toEqual([
        {
          code: 'LEXICAL_PARSE_FAILED',
          reason: 'lexical state could not be parsed for comparison',
          context: { error: expect.stringContaining('JSON') as string },
        },
      ]);
    });

    it.each(['{}', '{"root":{}}', '{"root":{"children":"invalid"}}'])(
      'fails closed for the structurally invalid document %s',
      (invalid) => {
        const tracker = loadedTracker();
        tracker.setLive(POST_ID, { lexical: invalid });

        expect(tracker.verdict().reasons).toEqual([
          {
            code: 'LEXICAL_PARSE_FAILED',
            reason: 'lexical state could not be parsed for comparison',
            context: { error: 'lexical root must be an object with a children array' },
          },
        ]);
        expect(tracker.verdict({ includeDiff: true }).diff).toBeUndefined();
      },
    );

    it('ignores undefined fields passed to setLive', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { lexical: serialize(appendParagraph(SAVED_DOC, 'Edit')) });
      tracker.setLive(POST_ID, { lexical: undefined, title: undefined });

      expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);
    });

    it('carries the three serialized states in the reason context', () => {
      const tracker = loadedTracker();
      const edited = serialize(appendParagraph(SAVED_DOC, 'Edit'));
      tracker.setLive(POST_ID, { lexical: edited });

      expect(tracker.verdict().reasons[0]).toEqual({
        code: 'SCRATCH_DIVERGED_FROM_SECONDARY',
        reason: 'main editor content has diverged from both hidden editor and saved content',
        context: {
          secondaryLexical: serialize(SAVED_DOC),
          lexical: serialize(SAVED_DOC),
          scratch: edited,
        },
      });
    });
  });

  describe('baseline readiness', () => {
    it('is dirty when the user types before the hidden editor reports', () => {
      const tracker = createChangeTracker();
      tracker.load(POST_ID, post());
      tracker.setLive(POST_ID, { lexical: serialize(appendParagraph(SAVED_DOC, 'Edit')) });

      expect(tracker.verdict().reasons).toEqual([
        {
          code: 'BASELINE_PENDING',
          reason:
            'main editor content has diverged from saved content before the hidden editor reported',
          context: {
            lexical: serialize(SAVED_DOC),
            scratch: serialize(appendParagraph(SAVED_DOC, 'Edit')),
          },
        },
      ]);
    });

    it('is dirty when a new post is typed into before the hidden editor reports', () => {
      const tracker = createChangeTracker();
      tracker.load(null, post({ lexical: null }));
      tracker.setLive(null, { lexical: serialize(doc([paragraph('Typed')])) });

      expect(codes(tracker)).toEqual(['BASELINE_PENDING']);
    });

    it('stays clean while pending when the live state matches the saved state', () => {
      const tracker = createChangeTracker();
      tracker.load(POST_ID, post());
      tracker.setLive(POST_ID, { lexical: serialize(SAVED_DOC) });

      expect(tracker.verdict().dirty).toBe(false);
    });

    it.each([null, '', serialize(doc([]))])(
      'treats a ready baseline of %j as a known empty document',
      (empty) => {
        const tracker = createChangeTracker();
        tracker.load(POST_ID, post({ lexical: null }));
        tracker.setBaseline(POST_ID, empty);
        tracker.setLive(POST_ID, { lexical: null });
        expect(tracker.verdict().dirty).toBe(false);

        tracker.setLive(POST_ID, { lexical: serialize(doc([paragraph('Typed')])) });
        expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);
      },
    );

    it.each([null, ''])(
      'treats explicitly clearing non-empty content to %j as dirty',
      (cleared) => {
        const tracker = loadedTracker();
        tracker.setLive(POST_ID, { lexical: cleared });

        expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);
      },
    );

    it('treats clearing to an empty root as dirty', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { lexical: serialize(doc([])) });

      expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);
    });

    it('falls back to a live-vs-saved compare when the hidden editor fails', () => {
      const tracker = createChangeTracker();
      tracker.load(POST_ID, post());
      tracker.baselineFailed(POST_ID, new Error('hidden editor crashed'));
      tracker.setLive(POST_ID, { lexical: serialize(SAVED_DOC) });
      expect(tracker.verdict().dirty).toBe(false);

      const edited = serialize(appendParagraph(SAVED_DOC, 'Edit'));
      tracker.setLive(POST_ID, { lexical: edited });
      expect(tracker.verdict().reasons).toEqual([
        {
          code: 'BASELINE_FAILED',
          reason:
            'main editor content has diverged from saved content and the hidden editor failed',
          context: {
            lexical: serialize(SAVED_DOC),
            scratch: edited,
            error: 'hidden editor crashed',
          },
        },
      ]);
    });

    it('keeps body protection for an old-schema post after the hidden editor fails', () => {
      const [fixture] = OLD_SCHEMA_CORPUS;
      const tracker = createChangeTracker();
      tracker.load(POST_ID, post({ lexical: serialize(fixture.before) }));
      tracker.baselineFailed(POST_ID, 'boom');
      tracker.setLive(POST_ID, { lexical: serialize(fixture.after) });

      expect(codes(tracker)).toEqual(['BASELINE_FAILED']);
    });

    it('recovers once a late baseline report arrives after a failure', () => {
      const tracker = createChangeTracker();
      tracker.load(POST_ID, post());
      tracker.baselineFailed(POST_ID, 'boom');
      const edited = serialize(appendParagraph(SAVED_DOC, 'Edit'));
      tracker.setLive(POST_ID, { lexical: edited });

      tracker.setBaseline(POST_ID, edited);
      expect(tracker.verdict().dirty).toBe(false);
    });
  });

  describe('tags', () => {
    it('compares tags by ordered name list', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { tags: [{ name: 'News' }, { name: 'Tech' }] });

      expect(tracker.verdict().reasons).toEqual([
        {
          code: 'POST_TAGS_DIVERGED',
          reason: 'tags are different',
          context: { currentTags: ['News', 'Tech'], previousTags: ['News'] },
        },
      ]);
    });

    it('ignores identity when the names match', () => {
      const tracker = loadedTracker(post({ tags: [{ name: 'News', id: '1' } as never] }));
      tracker.setLive(POST_ID, { tags: [{ name: 'News', id: 'unsaved' } as never] });

      expect(tracker.verdict().dirty).toBe(false);
    });

    it('treats reordered tags as a change', () => {
      const tracker = loadedTracker(post({ tags: [{ name: 'A' }, { name: 'B' }] }));
      tracker.setLive(POST_ID, { tags: [{ name: 'B' }, { name: 'A' }] });

      expect(codes(tracker)).toEqual(['POST_TAGS_DIVERGED']);
    });

    it('does not collide on delimiter-bearing names', () => {
      const tracker = loadedTracker(post({ tags: [{ name: 'A, B' }] }));
      tracker.setLive(POST_ID, { tags: [{ name: 'A' }, { name: 'B' }] });

      expect(codes(tracker)).toEqual(['POST_TAGS_DIVERGED']);
    });
  });

  describe('title', () => {
    it('reports a changed title', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { title: 'New title' });

      expect(tracker.verdict().reasons).toEqual([
        {
          code: 'POST_TITLE_DIVERGED',
          reason: 'title is different',
          context: { current: 'Title', scratch: 'New title' },
        },
      ]);
    });

    it('ignores surrounding whitespace', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { title: '  Title ' });

      expect(tracker.verdict().dirty).toBe(false);
    });
  });

  describe('save errors', () => {
    it('keeps the post dirty until the error is cleared', () => {
      const tracker = loadedTracker();
      tracker.markSaveError(['Validation failed']);

      expect(tracker.verdict().reasons).toEqual([
        { code: 'POST_HAS_ERROR', reason: 'isError', context: { messages: ['Validation failed'] } },
      ]);

      tracker.setLive(POST_ID, { lexical: serialize(SAVED_DOC) });
      expect(codes(tracker)).toEqual(['POST_HAS_ERROR']);

      tracker.clearSaveError();
      expect(tracker.verdict().dirty).toBe(false);
    });

    it('is cleared by an acknowledged save', () => {
      const tracker = loadedTracker();
      tracker.markSaveError();
      tracker.saveAcknowledged(POST_ID, post(), post());

      expect(tracker.verdict().dirty).toBe(false);
    });

    it('survives a refetch of the saved post', () => {
      const tracker = loadedTracker();
      tracker.markSaveError();
      tracker.setSaved(POST_ID, post());

      expect(codes(tracker)).toEqual(['POST_HAS_ERROR']);
    });

    it('is listed first when other reasons apply', () => {
      const tracker = loadedTracker();
      tracker.markSaveError();
      tracker.setLive(POST_ID, { title: 'Changed' });

      expect(codes(tracker)).toEqual(['POST_HAS_ERROR', 'POST_TITLE_DIVERGED']);
    });
  });

  describe('attributes', () => {
    it('reports changed attributes on an existing post', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { custom_excerpt: 'Excerpt' });

      expect(tracker.verdict().reasons).toEqual([
        {
          code: 'POST_HAS_DIRTY_ATTRIBUTES',
          reason: 'post.hasDirtyAttributes === true',
          context: { custom_excerpt: [null, 'Excerpt'] },
        },
      ]);
    });

    it('reports changed attributes on a new post under its own code', () => {
      const tracker = loadedTracker(post({ lexical: null }), null);
      tracker.setLive(null, { feature_image: 'https://site.example/a.jpg' });

      expect(tracker.verdict().reasons).toEqual([
        {
          code: 'NEW_POST_HAS_CHANGED_ATTRIBUTES',
          reason: 'post.changedAttributes.length > 0',
          context: { feature_image: [null, 'https://site.example/a.jpg'] },
        },
      ]);
    });

    it('patches the projection so independent observers do not clobber each other', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { custom_excerpt: 'Excerpt' });
      tracker.setLive(POST_ID, { feature_image: 'https://site.example/a.jpg' });

      expect(tracker.verdict().reasons[0]?.context).toEqual({
        custom_excerpt: [null, 'Excerpt'],
        feature_image: [null, 'https://site.example/a.jpg'],
      });

      tracker.setLive(POST_ID, { custom_excerpt: null });
      expect(tracker.verdict().reasons[0]?.context).toEqual({
        feature_image: [null, 'https://site.example/a.jpg'],
      });
    });

    it('reports a changed slug', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { slug: 'custom' });

      expect(tracker.verdict().reasons[0]?.context).toEqual({ slug: ['title', 'custom'] });
    });

    it('never treats updated_at as a live edit', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { updated_at: T2 });

      expect(tracker.verdict().dirty).toBe(false);
    });
  });

  describe('mutable aliasing', () => {
    it('clones the saved state at ingress', () => {
      const saved = post({ tags: [{ name: 'News' }], feature_image_caption: 'Caption' });
      const tracker = loadedTracker(saved);
      (saved.tags as Array<{ name: string }>).push({ name: 'Injected' });
      saved.feature_image_caption = 'Mutated';

      expect(tracker.verdict().dirty).toBe(false);
    });

    it('clones live patches at ingress', () => {
      const tracker = loadedTracker();
      const patch = { tags: [{ name: 'News' }] };
      tracker.setLive(POST_ID, patch);
      patch.tags.push({ name: 'Injected' });

      expect(tracker.verdict().dirty).toBe(false);
    });
  });

  describe('saved-state lifecycle', () => {
    it('does not reseed the live state on a refetch', () => {
      const tracker = loadedTracker(post({ title: 'First' }));
      tracker.setLive(POST_ID, { title: 'Edited' });
      tracker.setSaved(POST_ID, post({ title: 'First' }));

      expect(codes(tracker)).toEqual(['POST_TITLE_DIVERGED']);
    });

    it('does not touch the baseline on a refetch', () => {
      const [fixture] = OLD_SCHEMA_CORPUS;
      const tracker = createChangeTracker();
      tracker.load(POST_ID, post({ lexical: serialize(fixture.before) }));
      tracker.setBaseline(POST_ID, serialize(fixture.after));
      tracker.setLive(POST_ID, { lexical: serialize(fixture.after) });

      tracker.setSaved(POST_ID, post({ lexical: serialize(fixture.before), updated_at: T1 }));
      expect(tracker.verdict().dirty).toBe(false);
    });

    it('adopts a refetch carrying a newer collision token', () => {
      const tracker = loadedTracker();
      tracker.setSaved(POST_ID, post({ title: 'Renamed elsewhere', updated_at: T1 }));

      expect(tracker.verdict().reasons[0]).toMatchObject({
        code: 'POST_TITLE_DIVERGED',
        context: { current: 'Renamed elsewhere', scratch: 'Title' },
      });
    });

    it('drops a refetch older than the held collision token', () => {
      const tracker = loadedTracker();
      const edited = serialize(appendParagraph(SAVED_DOC, 'Edit'));
      tracker.setLive(POST_ID, { lexical: edited, title: 'Edited' });
      tracker.saveAcknowledged(
        POST_ID,
        post({ lexical: edited, title: 'Edited' }),
        post({ lexical: edited, title: 'Edited', updated_at: T1 }),
      );
      expect(tracker.verdict().dirty).toBe(false);

      tracker.setSaved(POST_ID, post({ updated_at: T0 }));
      expect(tracker.verdict().dirty).toBe(false);

      tracker.setSaved(POST_ID, post({ lexical: edited, title: 'Edited', updated_at: T1 }));
      expect(tracker.verdict().dirty).toBe(false);
    });

    it('always adopts the acknowledged collision token', () => {
      const tracker = loadedTracker(post({ updated_at: T2 }));
      tracker.saveAcknowledged(POST_ID, post(), post({ updated_at: T1 }));

      tracker.setSaved(POST_ID, post({ title: 'Refetched', updated_at: T1 }));
      expect(codes(tracker)).toEqual(['POST_TITLE_DIVERGED']);
    });

    it('becomes clean once the acknowledged save matches the live state', () => {
      const tracker = loadedTracker();
      const edited = serialize(appendParagraph(SAVED_DOC, 'Edit'));
      tracker.setLive(POST_ID, { lexical: edited, title: 'Edited' });
      expect(tracker.verdict().dirty).toBe(true);

      const submitted = post({ lexical: edited, title: 'Edited' });
      tracker.saveAcknowledged(POST_ID, submitted, { ...submitted, updated_at: T1 });
      expect(tracker.verdict().dirty).toBe(false);
    });

    it('re-baselines on an acknowledged save', () => {
      const [fixture] = OLD_SCHEMA_CORPUS;
      const tracker = createChangeTracker();
      tracker.load(POST_ID, post({ lexical: serialize(fixture.before) }));
      tracker.setBaseline(POST_ID, serialize(fixture.after));
      tracker.setLive(POST_ID, { lexical: serialize(fixture.after) });

      const edited = serialize(appendParagraph(fixture.after, 'Edit'));
      tracker.setLive(POST_ID, { lexical: edited });
      tracker.saveAcknowledged(POST_ID, post({ lexical: edited }), post({ lexical: edited }));
      expect(tracker.verdict().dirty).toBe(false);

      tracker.setLive(POST_ID, { lexical: serialize(fixture.after) });
      expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);
    });
  });

  describe('acknowledgement rebase', () => {
    it('keeps edits made while the save was in flight', () => {
      const tracker = loadedTracker();
      const submittedBody = serialize(appendParagraph(SAVED_DOC, 'Submitted'));
      tracker.setLive(POST_ID, {
        lexical: submittedBody,
        title: 'Submitted',
        tags: [{ name: 'News' }, { name: 'Tech' }],
        custom_excerpt: 'Submitted excerpt',
      });
      const submitted = post({
        lexical: submittedBody,
        title: 'Submitted',
        tags: [{ name: 'News' }, { name: 'Tech' }],
        custom_excerpt: 'Submitted excerpt',
      });

      const laterBody = serialize(
        appendParagraph(appendParagraph(SAVED_DOC, 'Submitted'), 'Later'),
      );
      tracker.setLive(POST_ID, {
        lexical: laterBody,
        title: 'Later',
        tags: [{ name: 'News' }, { name: 'Tech' }, { name: 'Later' }],
        custom_excerpt: 'Later excerpt',
      });

      tracker.saveAcknowledged(POST_ID, submitted, { ...submitted, updated_at: T1 });

      const verdict = tracker.verdict();
      expect(verdict.reasons.map((r) => r.code)).toEqual([
        'POST_TAGS_DIVERGED',
        'POST_TITLE_DIVERGED',
        'SCRATCH_DIVERGED_FROM_SECONDARY',
        'POST_HAS_DIRTY_ATTRIBUTES',
      ]);
      expect(verdict.reasons[3]?.context).toEqual({
        custom_excerpt: ['Submitted excerpt', 'Later excerpt'],
      });
    });

    it('adopts server-canonicalized values where the live state still matches the submission', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { title: '  My post ', slug: '' });
      const submitted = post({ title: '  My post ', slug: '' });
      tracker.saveAcknowledged(POST_ID, submitted, {
        ...submitted,
        title: 'My post',
        slug: 'my-post',
        updated_at: T1,
      });

      expect(tracker.verdict().dirty).toBe(false);
      tracker.setSaved(POST_ID, post({ title: 'My post', slug: 'my-post', updated_at: T1 }));
      expect(tracker.verdict().dirty).toBe(false);
    });

    it('rebases fields absent from a partial submission against the previous saved state', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { custom_excerpt: 'Typed during the save' });
      tracker.saveAcknowledged(
        POST_ID,
        { title: 'Title' },
        post({ slug: 'title-2', updated_at: T1 }),
      );

      expect(tracker.verdict().reasons).toEqual([
        expect.objectContaining({
          code: 'POST_HAS_DIRTY_ATTRIBUTES',
          context: { custom_excerpt: [null, 'Typed during the save'] },
        }),
      ]);
    });

    it('treats an undefined submitted field as not submitted', () => {
      const tracker = loadedTracker();
      tracker.saveAcknowledged(
        POST_ID,
        { title: undefined },
        post({ title: 'Server title', updated_at: T1 }),
      );

      expect(tracker.verdict().dirty).toBe(false);
    });

    it('treats a semantically equal body as still matching the submission', () => {
      const tracker = loadedTracker();
      const submittedBody = serialize(appendParagraph(SAVED_DOC, 'Edit'));
      tracker.setLive(POST_ID, {
        lexical: serialize(
          withLtrEverywhere(appendParagraph(SAVED_DOC, 'Edit')) as LexicalDocument,
        ),
      });
      const submitted = post({ lexical: submittedBody });
      tracker.saveAcknowledged(POST_ID, submitted, { ...submitted, updated_at: T1 });

      expect(tracker.verdict().dirty).toBe(false);
    });
  });

  describe('post identity', () => {
    it('adopts the created id from the first acknowledgement and keeps the live state', () => {
      const tracker = createChangeTracker();
      tracker.load(null, post({ title: '', slug: '', lexical: null, tags: [], updated_at: null }));
      tracker.setBaseline(null, serialize(BLANK_DOC));
      tracker.setLive(null, { lexical: serialize(BLANK_DOC) });

      const typed = serialize(doc([paragraph('Typed')]));
      tracker.setLive(null, { lexical: typed, title: 'Hi' });
      const submitted = post({ title: 'Hi', slug: '', lexical: typed, tags: [], updated_at: null });

      const typedMore = serialize(doc([paragraph('Typed more')]));
      tracker.setLive(null, { lexical: typedMore });
      tracker.saveAcknowledged('created-1', submitted, {
        ...submitted,
        slug: 'hi',
        updated_at: T1,
      });

      expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);

      tracker.setSaved(
        'created-1',
        post({ title: 'Hi', slug: 'hi', lexical: typed, tags: [], updated_at: T1 }),
      );
      expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);

      tracker.setSaved(null, post({ title: 'Stale', lexical: null }));
      expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);
    });

    it('keeps accepting null-id editor events after the created id is adopted', () => {
      const tracker = createChangeTracker();
      tracker.load(null, post({ lexical: null, updated_at: null }));
      tracker.setBaseline(null, serialize(BLANK_DOC));
      tracker.setLive(null, { lexical: serialize(BLANK_DOC) });
      const submitted = post({ lexical: serialize(BLANK_DOC), updated_at: null });
      tracker.saveAcknowledged('new1', submitted, { ...submitted, updated_at: T1 });
      expect(tracker.verdict().dirty).toBe(false);

      tracker.setLive(null, { lexical: serialize(doc([paragraph('Typed')])) });
      expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);

      tracker.setBaseline(null, serialize(doc([paragraph('Typed')])));
      expect(tracker.verdict().dirty).toBe(false);
      tracker.baselineFailed(null, 'boom');
      tracker.setLive(null, { lexical: serialize(doc([paragraph('Typed more')])) });
      expect(codes(tracker)).toEqual(['BASELINE_FAILED']);

      tracker.setSaved(null, post({ title: 'Stale' }));
      expect(codes(tracker)).toEqual(['BASELINE_FAILED']);
    });

    it('does not alias null to a post loaded with an id', () => {
      const tracker = loadedTracker();
      tracker.setLive(null, { title: 'Edited' });

      expect(tracker.verdict().dirty).toBe(false);
    });

    it('rejects a late acknowledgement for a previously held post while a new post is open', () => {
      const tracker = loadedTracker(post({ title: 'A' }), 'a');
      tracker.setLive('a', { title: 'A edited' });
      tracker.load(null, post({ title: '', lexical: null, updated_at: null }));

      tracker.saveAcknowledged(
        'a',
        post({ title: 'A edited' }),
        post({ title: 'A edited', updated_at: T2 }),
      );
      expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
      tracker.setSaved('a', post({ title: 'A refetched', updated_at: T2 }));
      expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });

      const submitted = post({ title: 'New', lexical: null, updated_at: null });
      tracker.setLive(null, { title: 'New' });
      tracker.saveAcknowledged('new1', submitted, { ...submitted, updated_at: T2 });
      tracker.setSaved('new1', post({ title: 'New refetched', lexical: null, updated_at: T2 }));
      expect(codes(tracker)).toEqual(['POST_TITLE_DIVERGED']);
    });

    it('ignores a refetch of the previous post after switching', () => {
      const tracker = loadedTracker(post({ title: 'A' }), 'a');
      tracker.load('b', post({ title: 'B' }));
      tracker.setBaseline('b', serialize(SAVED_DOC));
      tracker.saveAcknowledged('b', post({ title: 'B' }), post({ title: 'B', updated_at: T1 }));

      tracker.setSaved('a', post({ title: 'A refetched', updated_at: T2 }));
      expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
    });

    it('ignores callbacks from the previous post after switching', () => {
      const tracker = loadedTracker(post({ title: 'A' }), 'a');
      tracker.load('b', post({ title: 'B' }));

      tracker.setBaseline('a', serialize(doc([paragraph('A baseline')])));
      tracker.baselineFailed('a', 'boom');
      tracker.setLive('a', { title: 'A edited', lexical: serialize(doc([paragraph('A typed')])) });
      tracker.saveAcknowledged(
        'a',
        post({ title: 'A edited' }),
        post({ title: 'A edited', updated_at: T2 }),
      );
      tracker.revisionRestored('a', {
        lexical: serialize(doc([paragraph('A restored')])),
        title: 'A restored',
        custom_excerpt: null,
        feature_image: null,
        feature_image_alt: null,
        feature_image_caption: null,
      });

      expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
      tracker.setLive('b', { lexical: serialize(doc([paragraph('B typed')])) });
      expect(codes(tracker)).toEqual(['BASELINE_PENDING']);
    });

    it('is inert after dispose', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { title: 'Edited' });
      tracker.dispose();

      expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
      expect(tracker.hasChangedSinceRevision(null)).toBe(false);

      tracker.load(POST_ID, post());
      tracker.setLive(POST_ID, { title: 'Edited again' });
      tracker.markSaveError('boom');
      tracker.setSaved(POST_ID, post());
      tracker.saveAcknowledged(POST_ID, post(), post());
      tracker.setBaseline(POST_ID, serialize(SAVED_DOC));
      tracker.baselineFailed(POST_ID, 'boom');
      expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
    });
  });

  describe('revision restore', () => {
    const restored = {
      lexical: serialize(doc([paragraph('Restored')])),
      title: 'Restored title',
      custom_excerpt: 'Restored excerpt',
      feature_image: 'https://site.example/restored.jpg',
      feature_image_alt: 'Restored alt',
      feature_image_caption: 'Restored caption',
    };

    it('adopts the full restored projection into saved and live', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, {
        lexical: serialize(appendParagraph(SAVED_DOC, 'Edit')),
        title: 'Edited',
        custom_excerpt: 'Edited excerpt',
      });
      expect(tracker.verdict().dirty).toBe(true);

      tracker.revisionRestored(POST_ID, restored);
      expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });

      tracker.setLive(POST_ID, { lexical: restored.lexical, title: restored.title });
      expect(tracker.verdict().dirty).toBe(false);

      tracker.setLive(POST_ID, { title: 'Edited after restore' });
      expect(tracker.verdict().reasons[0]).toMatchObject({
        code: 'POST_TITLE_DIVERGED',
        context: { current: 'Restored title', scratch: 'Edited after restore' },
      });
    });

    it('waits for the hidden editor to re-report after an old-schema restore', () => {
      const [fixture] = OLD_SCHEMA_CORPUS;
      const tracker = loadedTracker();
      tracker.revisionRestored(POST_ID, { ...restored, lexical: serialize(fixture.before) });

      tracker.setLive(POST_ID, { lexical: serialize(fixture.after) });
      expect(codes(tracker)).toEqual(['BASELINE_PENDING']);

      tracker.setBaseline(POST_ID, serialize(fixture.after));
      expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });

      tracker.setLive(POST_ID, {
        lexical: serialize(appendParagraph(fixture.after, 'After restore')),
      });
      expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);
    });

    it('reports dirty when a later save fails', () => {
      const tracker = loadedTracker();
      tracker.revisionRestored(POST_ID, restored);
      tracker.markSaveError(['Server error']);

      expect(codes(tracker)).toEqual(['POST_HAS_ERROR']);
    });
  });

  describe('hasChangedSinceRevision', () => {
    const siteUrl = 'https://site.example';
    const absolute = serialize(
      doc([
        {
          type: 'image',
          version: 1,
          src: `${siteUrl}/content/images/a.jpg`,
          href: `${siteUrl}/about/`,
        },
      ]),
    );
    const relative = serialize(
      doc([{ type: 'image', version: 1, src: '/content/images/a.jpg', href: '/about/' }]),
    );
    const revision = (overrides: Partial<EditablePostProjection> = {}) => {
      const saved = post(overrides);
      return {
        lexical: saved.lexical,
        title: saved.title,
        custom_excerpt: saved.custom_excerpt,
        feature_image: saved.feature_image,
      };
    };

    function trackerWithSite(saved: EditablePostProjection) {
      const tracker = createChangeTracker({ siteUrl });
      tracker.load(POST_ID, saved);
      tracker.setBaseline(POST_ID, saved.lexical);
      tracker.setLive(POST_ID, { lexical: saved.lexical });
      return tracker;
    }

    it('is true when there is no revision yet', () => {
      const tracker = loadedTracker();

      expect(tracker.hasChangedSinceRevision(undefined)).toBe(true);
      expect(tracker.hasChangedSinceRevision(null)).toBe(true);
    });

    it('is false for a new post', () => {
      const tracker = createChangeTracker({ siteUrl });
      tracker.load(null, post({ lexical: absolute }));

      expect(tracker.hasChangedSinceRevision(revision({ lexical: relative }))).toBe(false);
    });

    it('normalizes site URLs on both sides before comparing', () => {
      const tracker = trackerWithSite(post({ lexical: absolute }));

      expect(tracker.hasChangedSinceRevision(revision({ lexical: relative }))).toBe(false);
      expect(tracker.hasChangedSinceRevision(revision({ lexical: absolute }))).toBe(false);
    });

    it('compares the saved state, not the live scratch', () => {
      const tracker = trackerWithSite(post({ lexical: absolute }));
      tracker.setLive(POST_ID, { lexical: serialize(appendParagraph(SAVED_DOC, 'Unsaved')) });

      expect(tracker.hasChangedSinceRevision(revision({ lexical: absolute }))).toBe(false);
    });

    it('detects a saved body change since the revision', () => {
      const tracker = trackerWithSite(post({ lexical: absolute }));

      expect(tracker.hasChangedSinceRevision(revision())).toBe(true);
    });

    it.each([
      ['title', { title: 'Renamed' }],
      ['custom_excerpt', { custom_excerpt: 'Excerpt' }],
      ['feature_image', { feature_image: 'https://site.example/a.jpg' }],
    ] as const)('detects a %s change without a body change', (_field, change) => {
      const tracker = loadedTracker(post(change));

      expect(tracker.hasChangedSinceRevision(revision())).toBe(true);
      expect(tracker.hasChangedSinceRevision(revision(change))).toBe(false);
    });

    it('treats a missing revision excerpt or feature image as null', () => {
      const tracker = loadedTracker();

      expect(
        tracker.hasChangedSinceRevision({ lexical: serialize(SAVED_DOC), title: 'Title' }),
      ).toBe(false);
    });

    it('ignores key order and direction in the body', () => {
      const tracker = loadedTracker(
        post({ lexical: serialize(doc([paragraph('Hello', 'ltr')], 'ltr')) }),
      );
      const reordered = JSON.stringify({
        root: {
          version: 1,
          type: 'root',
          indent: 0,
          format: '',
          direction: null,
          children: [paragraph('Hello')],
        },
      });

      expect(tracker.hasChangedSinceRevision(revision({ lexical: reordered }))).toBe(false);
    });

    it('fails closed when the revision body cannot be parsed', () => {
      const tracker = loadedTracker();

      expect(tracker.hasChangedSinceRevision(revision({ lexical: '{}' }))).toBe(true);
    });
  });

  describe('site URL normalization', () => {
    const link = (href: string) => ({
      children: [textNode('link')],
      direction: null,
      format: '',
      indent: 0,
      type: 'link',
      version: 1,
      rel: null,
      target: null,
      title: null,
      url: href,
    });
    const withLink = (href: string) =>
      serialize(doc([{ ...paragraph('See the '), children: [textNode('See the '), link(href)] }]));

    function trackerWithSite(siteUrl: string, savedLexical: string) {
      const tracker = createChangeTracker({ siteUrl });
      tracker.load(POST_ID, post({ lexical: savedLexical }));
      tracker.setBaseline(POST_ID, savedLexical);
      return tracker;
    }

    it.each(['https://site.example', 'https://site.example/'])(
      'treats a relative live link and its absolute saved form as the same content (%s)',
      (siteUrl) => {
        const tracker = trackerWithSite(siteUrl, withLink('https://site.example/about/'));
        tracker.setLive(POST_ID, { lexical: withLink('/about/') });

        expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
      },
    );

    it.each(['https://site.example/blog', 'https://site.example/blog/'])(
      'keeps the subdirectory of a subdirectory install (%s)',
      (siteUrl) => {
        const tracker = trackerWithSite(siteUrl, withLink('https://site.example/blog/about/'));
        tracker.setLive(POST_ID, { lexical: withLink('/blog/about/') });
        expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });

        tracker.setLive(POST_ID, { lexical: withLink('https://site.example/other/') });
        expect(tracker.verdict().dirty).toBe(true);
      },
    );

    it('normalizes card URL properties', () => {
      const siteUrl = 'https://site.example';
      const image = (prefix: string) =>
        serialize(
          doc([
            {
              type: 'image',
              version: 1,
              src: `${prefix}/content/images/a.jpg`,
              href: `${prefix}/about/`,
              caption: 'Caption',
            },
          ]),
        );
      const tracker = trackerWithSite(siteUrl, image(siteUrl));
      tracker.setLive(POST_ID, { lexical: image('') });

      expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
    });

    it('still detects a changed link', () => {
      const tracker = trackerWithSite(
        'https://site.example',
        withLink('https://site.example/about/'),
      );
      tracker.setLive(POST_ID, { lexical: withLink('/contact/') });

      expect(tracker.verdict({ includeDiff: true })).toEqual({
        dirty: true,
        reasons: [expect.objectContaining({ code: 'SCRATCH_DIVERGED_FROM_SECONDARY' })],
        diff: [
          {
            type: 'CHANGE',
            path: 'root.children.0[paragraph].children.1[link].url',
            value: '/contact/',
            oldValue: '/about/',
          },
        ],
      });
    });

    it('keeps a literal site URL deleted from prose dirty', () => {
      const tracker = trackerWithSite(
        'https://site.example',
        serialize(doc([paragraph('Read https://site.example')])),
      );
      tracker.setLive(POST_ID, { lexical: serialize(doc([paragraph('Read ')])) });

      expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);
    });

    it.each([
      [
        'codeblock',
        { type: 'codeblock', version: 1, language: '', code: 'fetch("https://site.example/api/")' },
      ],
      ['html', { type: 'html', version: 1, html: '<a href="https://site.example/about/">x</a>' }],
      ['markdown', { type: 'markdown', version: 1, markdown: '[x](https://site.example/about/)' }],
      [
        'image caption',
        { type: 'image', version: 1, src: '/a.jpg', caption: 'See https://site.example/about/' },
      ],
      [
        'call-to-action',
        { type: 'call-to-action', version: 1, buttonUrl: 'https://site.example/about/' },
      ],
    ])('keeps a literal URL edited in %s dirty', (_name, node) => {
      const siteUrl = 'https://site.example';
      const tracker = trackerWithSite(siteUrl, serialize(doc([node])));
      const edited = JSON.parse(JSON.stringify(node).replaceAll(siteUrl, '')) as Record<
        string,
        unknown
      >;
      tracker.setLive(POST_ID, { lexical: serialize(doc([edited])) });

      expect(codes(tracker)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);
    });

    it('compares verbatim when no site URL is configured', () => {
      const tracker = trackerWithSite('', withLink('https://site.example/about/'));
      tracker.setLive(POST_ID, { lexical: withLink('/about/') });

      expect(tracker.verdict().dirty).toBe(true);
    });
  });

  describe('diff', () => {
    it('is omitted unless requested and the content diverged', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, { title: 'Edited' });

      expect(tracker.verdict({ includeDiff: true }).diff).toBeUndefined();

      tracker.setLive(POST_ID, { lexical: serialize(appendParagraph(SAVED_DOC, 'Edit')) });
      expect(tracker.verdict().diff).toBeUndefined();
    });

    it('is omitted while the baseline is pending', () => {
      const tracker = createChangeTracker();
      tracker.load(POST_ID, post());
      tracker.setLive(POST_ID, { lexical: serialize(appendParagraph(SAVED_DOC, 'Edit')) });

      expect(tracker.verdict({ includeDiff: true }).diff).toBeUndefined();
    });

    it('humanizes the baseline-to-live difference with node types', () => {
      const tracker = loadedTracker();
      tracker.setLive(POST_ID, {
        lexical: serialize(doc([paragraph('Hello world', 'ltr')], 'ltr')),
      });

      expect(tracker.verdict({ includeDiff: true }).diff).toEqual([
        {
          type: 'CHANGE',
          path: 'root.children.0[paragraph].children.0[extended-text].text',
          value: 'Hello world',
          oldValue: 'Hello',
        },
      ]);
    });

    it('reports a deleted block as a removal', () => {
      const tracker = loadedTracker(
        post({ lexical: serialize(doc([paragraph('Hello'), paragraph('Gone')])) }),
      );
      tracker.setLive(POST_ID, { lexical: serialize(doc([paragraph('Hello')])) });

      expect(tracker.verdict({ includeDiff: true }).diff).toEqual([
        {
          type: 'REMOVE',
          path: 'root.children.1[paragraph]',
          oldValue: stripDirection(paragraph('Gone')),
        },
      ]);
    });
  });
});
