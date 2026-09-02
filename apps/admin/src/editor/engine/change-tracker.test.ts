import { describe, expect, it } from 'vitest';
import { OLD_SCHEMA_CORPUS } from '@/editor/engine/__fixtures__';
import { createChangeTracker, type SavedPostState } from '@/editor/engine/change-tracker';
import { stripDirection, type LexicalDocument } from '@/editor/engine/lexical-compare';

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

function savedPost(overrides: Partial<SavedPostState> = {}): SavedPostState {
  return {
    isNew: false,
    title: 'Title',
    lexical: serialize(SAVED_DOC),
    tags: [{ name: 'News' }],
    attributes: { custom_excerpt: null, feature_image: null },
    ...overrides,
  };
}

function loadedTracker(saved: SavedPostState = savedPost()) {
  const tracker = createChangeTracker();
  tracker.setSaved(saved);
  tracker.setBaseline(saved.lexical);
  tracker.setLive({ lexical: saved.lexical });
  return tracker;
}

describe('createChangeTracker', () => {
  it('is clean before a post is loaded', () => {
    expect(createChangeTracker().verdict()).toEqual({ dirty: false, reasons: [] });
  });

  it('is clean right after load, before the editors report', () => {
    const tracker = createChangeTracker();
    tracker.setSaved(savedPost());

    expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
  });

  describe('invariant 5: loading old-schema content is clean until the user edits', () => {
    it.each(OLD_SCHEMA_CORPUS)('$name ($provenance)', ({ before, after }) => {
      const tracker = createChangeTracker();
      tracker.setSaved(savedPost({ lexical: serialize(before) }));
      tracker.setBaseline(serialize(after));
      tracker.setLive({ lexical: serialize(after) });

      expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
    });

    it.each(OLD_SCHEMA_CORPUS)('$name: a user edit after load is dirty', ({ before, after }) => {
      const tracker = createChangeTracker();
      tracker.setSaved(savedPost({ lexical: serialize(before) }));
      tracker.setBaseline(serialize(after));
      tracker.setLive({ lexical: serialize(appendParagraph(after, 'User typed this')) });

      const verdict = tracker.verdict();
      expect(verdict.dirty).toBe(true);
      expect(verdict.reasons.map((r) => r.code)).toEqual(['SCRATCH_DIVERGED_FROM_SECONDARY']);
    });

    it.each(OLD_SCHEMA_CORPUS)(
      '$name: direction inferred at depth by a mounted editor is ignored',
      ({ before, after }) => {
        const tracker = createChangeTracker();
        tracker.setSaved(savedPost({ lexical: serialize(before) }));
        tracker.setBaseline(serialize(after));
        tracker.setLive({ lexical: serialize(withLtrEverywhere(after) as LexicalDocument) });

        expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
      },
    );
  });

  describe('lexical divergence', () => {
    it('requires divergence from both the saved and the baseline state', () => {
      const tracker = loadedTracker();
      tracker.setLive({ lexical: serialize(appendParagraph(SAVED_DOC, 'Edit')) });
      expect(tracker.verdict().dirty).toBe(true);

      tracker.setLive({ lexical: serialize(SAVED_DOC) });
      expect(tracker.verdict().dirty).toBe(false);
    });

    it('is not dirty while the baseline is still unknown', () => {
      const tracker = createChangeTracker();
      tracker.setSaved(savedPost());
      tracker.setLive({ lexical: serialize(appendParagraph(SAVED_DOC, 'Edit')) });

      expect(tracker.verdict().dirty).toBe(false);
    });

    it('is dirty for a new post without saved content once the user types', () => {
      const tracker = createChangeTracker();
      tracker.setSaved(savedPost({ isNew: true, lexical: null }));
      const blank = serialize(doc([{ ...paragraph(''), children: [] }]));
      tracker.setBaseline(blank);
      tracker.setLive({ lexical: blank });
      expect(tracker.verdict().dirty).toBe(false);

      tracker.setLive({ lexical: serialize(doc([paragraph('Typed')])) });
      expect(tracker.verdict().reasons.map((r) => r.code)).toEqual([
        'SCRATCH_DIVERGED_FROM_SECONDARY',
      ]);
    });

    it('fails closed when the lexical state cannot be parsed', () => {
      const tracker = loadedTracker();
      tracker.setLive({ lexical: '{not json' });

      expect(tracker.verdict().reasons).toEqual([
        {
          code: 'LEXICAL_PARSE_FAILED',
          reason: 'lexical state could not be parsed for comparison',
          context: { error: expect.stringContaining('JSON') as string },
        },
      ]);
    });

    it('ignores undefined fields passed to setLive', () => {
      const tracker = loadedTracker();
      tracker.setLive({ lexical: serialize(appendParagraph(SAVED_DOC, 'Edit')) });
      tracker.setLive({ lexical: undefined, title: undefined });

      expect(tracker.verdict().reasons.map((r) => r.code)).toEqual([
        'SCRATCH_DIVERGED_FROM_SECONDARY',
      ]);
    });

    it('carries the three serialized states in the reason context', () => {
      const tracker = loadedTracker();
      const edited = serialize(appendParagraph(SAVED_DOC, 'Edit'));
      tracker.setLive({ lexical: edited });

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

  describe('tags', () => {
    it('compares tags by name list', () => {
      const tracker = loadedTracker();
      tracker.setLive({ tags: [{ name: 'News' }, { name: 'Tech' }] });

      expect(tracker.verdict().reasons).toEqual([
        {
          code: 'POST_TAGS_DIVERGED',
          reason: 'tags are different',
          context: { currentTags: 'News, Tech', previousTags: 'News' },
        },
      ]);
    });

    it('ignores identity when the names match', () => {
      const tracker = loadedTracker(savedPost({ tags: [{ name: 'News', id: '1' } as never] }));
      tracker.setLive({ tags: [{ name: 'News', id: 'unsaved' } as never] });

      expect(tracker.verdict().dirty).toBe(false);
    });

    it('treats reordered tags as a change', () => {
      const tracker = loadedTracker(savedPost({ tags: [{ name: 'A' }, { name: 'B' }] }));
      tracker.setLive({ tags: [{ name: 'B' }, { name: 'A' }] });

      expect(tracker.verdict().reasons.map((r) => r.code)).toEqual(['POST_TAGS_DIVERGED']);
    });
  });

  describe('title', () => {
    it('reports a changed title', () => {
      const tracker = loadedTracker();
      tracker.setLive({ title: 'New title' });

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
      tracker.setLive({ title: '  Title ' });

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

      tracker.setLive({ lexical: serialize(SAVED_DOC) });
      expect(tracker.verdict().reasons.map((r) => r.code)).toEqual(['POST_HAS_ERROR']);

      tracker.clearSaveError();
      expect(tracker.verdict().dirty).toBe(false);
    });

    it('is cleared by an acknowledged save', () => {
      const tracker = loadedTracker();
      tracker.markSaveError();
      tracker.setSaved(savedPost());

      expect(tracker.verdict().dirty).toBe(false);
    });

    it('is listed first when other reasons apply', () => {
      const tracker = loadedTracker();
      tracker.markSaveError();
      tracker.setLive({ title: 'Changed' });

      expect(tracker.verdict().reasons.map((r) => r.code)).toEqual([
        'POST_HAS_ERROR',
        'POST_TITLE_DIVERGED',
      ]);
    });
  });

  describe('attributes', () => {
    it('reports changed attributes on an existing post', () => {
      const tracker = loadedTracker();
      tracker.setLive({ attributes: { custom_excerpt: 'Excerpt', feature_image: null } });

      expect(tracker.verdict().reasons).toEqual([
        {
          code: 'POST_HAS_DIRTY_ATTRIBUTES',
          reason: 'post.hasDirtyAttributes === true',
          context: { custom_excerpt: [null, 'Excerpt'] },
        },
      ]);
    });

    it('reports changed attributes on a new post under its own code', () => {
      const tracker = loadedTracker(savedPost({ isNew: true, attributes: {} }));
      tracker.setLive({ attributes: { feature_image: 'https://site.example/a.jpg' } });

      expect(tracker.verdict().reasons).toEqual([
        {
          code: 'NEW_POST_HAS_CHANGED_ATTRIBUTES',
          reason: 'post.changedAttributes.length > 0',
          context: { feature_image: [undefined, 'https://site.example/a.jpg'] },
        },
      ]);
    });

    it('compares nested values structurally', () => {
      const tracker = loadedTracker(savedPost({ attributes: { authors: [{ id: '1' }] } }));
      tracker.setLive({ attributes: { authors: [{ id: '1' }] } });

      expect(tracker.verdict().dirty).toBe(false);
    });
  });

  describe('saved-state lifecycle', () => {
    it('seeds the live state from the first saved state only', () => {
      const tracker = createChangeTracker();
      tracker.setSaved(savedPost({ title: 'First' }));
      tracker.setLive({ title: 'Edited' });
      tracker.setSaved(savedPost({ title: 'First' }));

      expect(tracker.verdict().reasons.map((r) => r.code)).toEqual(['POST_TITLE_DIVERGED']);
    });

    it('becomes clean once the acknowledged save matches the live state', () => {
      const tracker = loadedTracker();
      const edited = serialize(appendParagraph(SAVED_DOC, 'Edit'));
      tracker.setLive({ lexical: edited, title: 'Edited' });
      expect(tracker.verdict().dirty).toBe(true);

      tracker.setSaved(savedPost({ lexical: edited, title: 'Edited' }));
      expect(tracker.verdict().dirty).toBe(false);
    });

    it('re-baselines on an acknowledged save', () => {
      const [fixture] = OLD_SCHEMA_CORPUS;
      const tracker = createChangeTracker();
      tracker.setSaved(savedPost({ lexical: serialize(fixture.before) }));
      tracker.setBaseline(serialize(fixture.after));
      tracker.setLive({ lexical: serialize(fixture.after) });

      const edited = serialize(appendParagraph(fixture.after, 'Edit'));
      tracker.setLive({ lexical: edited });
      tracker.setSaved(savedPost({ lexical: edited }));
      expect(tracker.verdict().dirty).toBe(false);

      tracker.setLive({ lexical: serialize(fixture.after) });
      expect(tracker.verdict().reasons.map((r) => r.code)).toEqual([
        'SCRATCH_DIVERGED_FROM_SECONDARY',
      ]);
    });

    it('does not touch the baseline on the initial load', () => {
      const [fixture] = OLD_SCHEMA_CORPUS;
      const tracker = createChangeTracker();
      tracker.setSaved(savedPost({ lexical: serialize(fixture.before) }));
      tracker.setLive({ lexical: serialize(fixture.after) });
      expect(tracker.verdict().dirty).toBe(false);

      tracker.setBaseline(serialize(fixture.after));
      expect(tracker.verdict().dirty).toBe(false);
    });

    it('reports dirty when a save fails after a restore', () => {
      const tracker = loadedTracker();
      tracker.revisionRestored(doc([paragraph('Restored')]));
      tracker.markSaveError(['Server error']);

      expect(tracker.verdict().reasons.map((r) => r.code)).toEqual(['POST_HAS_ERROR']);
    });

    it('re-captures the baseline when a revision is restored', () => {
      const tracker = loadedTracker();
      tracker.setLive({ lexical: serialize(appendParagraph(SAVED_DOC, 'Edit')) });
      expect(tracker.verdict().dirty).toBe(true);

      const restored = doc([paragraph('Restored')]);
      tracker.revisionRestored(restored);
      expect(tracker.verdict().dirty).toBe(false);

      tracker.setSaved(savedPost({ lexical: serialize(restored) }));
      expect(tracker.verdict().dirty).toBe(false);

      tracker.setLive({ lexical: serialize(appendParagraph(restored, 'After restore')) });
      expect(tracker.verdict().reasons.map((r) => r.code)).toEqual([
        'SCRATCH_DIVERGED_FROM_SECONDARY',
      ]);
    });

    it('clears everything on reset', () => {
      const tracker = loadedTracker();
      tracker.markSaveError();
      tracker.setLive({ title: 'Edited' });
      tracker.reset();

      expect(tracker.verdict()).toEqual({ dirty: false, reasons: [] });
      expect(tracker.hasChangedSinceRevision(null, '')).toBe(false);
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

    it('is true when there is no revision yet', () => {
      const tracker = loadedTracker();

      expect(tracker.hasChangedSinceRevision(undefined, siteUrl)).toBe(true);
      expect(tracker.hasChangedSinceRevision(null, siteUrl)).toBe(true);
    });

    it('is false for a new post', () => {
      const tracker = loadedTracker(savedPost({ isNew: true, lexical: absolute }));

      expect(tracker.hasChangedSinceRevision(relative, siteUrl)).toBe(false);
    });

    it('strips the site URL from both sides before comparing', () => {
      const tracker = loadedTracker(savedPost({ lexical: absolute }));

      expect(tracker.hasChangedSinceRevision(relative, siteUrl)).toBe(false);
      expect(tracker.hasChangedSinceRevision(absolute, siteUrl)).toBe(false);
    });

    it('compares the saved state, not the live scratch', () => {
      const tracker = loadedTracker(savedPost({ lexical: absolute }));
      tracker.setLive({ lexical: serialize(appendParagraph(SAVED_DOC, 'Unsaved')) });

      expect(tracker.hasChangedSinceRevision(absolute, siteUrl)).toBe(false);
    });

    it('detects a saved change since the revision', () => {
      const tracker = loadedTracker(savedPost({ lexical: absolute }));

      expect(tracker.hasChangedSinceRevision(serialize(SAVED_DOC), siteUrl)).toBe(true);
    });
  });

  describe('diff', () => {
    it('is omitted unless requested and the content diverged', () => {
      const tracker = loadedTracker();
      tracker.setLive({ title: 'Edited' });

      expect(tracker.verdict({ includeDiff: true }).diff).toBeUndefined();

      tracker.setLive({ lexical: serialize(appendParagraph(SAVED_DOC, 'Edit')) });
      expect(tracker.verdict().diff).toBeUndefined();
    });

    it('humanizes the baseline-to-live difference with node types', () => {
      const tracker = loadedTracker();
      tracker.setLive({ lexical: serialize(doc([paragraph('Hello world', 'ltr')], 'ltr')) });

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
        savedPost({ lexical: serialize(doc([paragraph('Hello'), paragraph('Gone')])) }),
      );
      tracker.setLive({ lexical: serialize(doc([paragraph('Hello')])) });

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
