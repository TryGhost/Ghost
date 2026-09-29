import { describe, expect, it } from 'vitest';
import type { LocalRevision, LocalRevisionAuthor } from '@/editor/local-revisions';
import { restoredPost } from '@/editor/restore/restored-post';

function copy(overrides: Partial<LocalRevision> = {}): LocalRevision {
  return {
    id: 'post-1',
    type: 'post',
    revisionTimestamp: 1000,
    title: 'Lost words',
    slug: 'lost-words',
    status: 'draft',
    lexical: '{"root":{"children":[]}}',
    ...overrides,
  };
}

describe('restoredPost', () => {
  it('makes a new draft marked as restored from the copy', () => {
    expect(
      restoredPost(
        copy({
          authors: [{ id: 'user-1' }],
          tags: [{ id: 'tag-1', name: 'News', slug: 'news' }],
        }),
      ),
    ).toEqual({
      type: 'post',
      title: '(Restored) Lost words',
      slug: 'lost-words',
      lexical: '{"root":{"children":[]}}',
      status: 'draft',
      authors: [{ id: 'user-1' }],
      tags: [{ id: 'tag-1', name: 'News', slug: 'news' }],
    });
  });

  it('keeps a page a page', () => {
    expect(restoredPost(copy({ type: 'page' })).type).toBe('page');
  });

  it('restores a copy written with no type as a post', () => {
    const untyped = { ...copy(), type: undefined } as unknown as LocalRevision;

    expect(restoredPost(untyped).type).toBe('post');
  });

  it('falls back to an untitled slug and a bare title', () => {
    const restored = restoredPost(copy({ title: '', slug: '' }));

    expect(restored.title).toBe('(Restored)');
    expect(restored.slug).toBe('untitled');
  });

  it('sends only the id of each author, dropping any without one', () => {
    const restored = restoredPost(
      copy({
        authors: [{ id: 'user-1', name: 'Jo', email: 'jo@example.com' } as LocalRevisionAuthor, {}],
      }),
    );

    expect(restored.authors).toEqual([{ id: 'user-1' }]);
  });

  it('names a tag that was typed but never saved, so the create makes it', () => {
    const restored = restoredPost(copy({ tags: [{ name: 'Brand new' }, {}] }));

    expect(restored.tags).toEqual([{ name: 'Brand new' }]);
  });

  it('keeps the body empty when the copy has none', () => {
    expect(restoredPost(copy({ lexical: undefined })).lexical).toBeNull();
  });

  it('leaves authors out when the copy credits nobody, so the server credits the restorer', () => {
    expect(restoredPost(copy({ authors: [] }))).not.toHaveProperty('authors');
    expect(restoredPost(copy({ authors: undefined }))).not.toHaveProperty('authors');
  });

  it('credits only the restorer when they may not create posts for anyone else', () => {
    const restored = restoredPost(copy({ authors: [{ id: 'editor-1' }, { id: 'user-2' }] }), {
      soleAuthorId: 'user-2',
    });

    expect(restored.authors).toEqual([{ id: 'user-2' }]);
  });

  it('brings back the excerpt and feature image the copy kept', () => {
    const restored = restoredPost(
      copy({
        custom_excerpt: 'In short',
        feature_image: 'https://example.com/image.jpg',
        feature_image_alt: 'A hillside',
        feature_image_caption: 'Taken at dawn',
      }),
    );

    expect(restored).toMatchObject({
      custom_excerpt: 'In short',
      feature_image: 'https://example.com/image.jpg',
      feature_image_alt: 'A hillside',
      feature_image_caption: 'Taken at dawn',
    });
    expect(restoredPost(copy({ feature_image: null }))).not.toHaveProperty('feature_image');
  });

  it('shortens a title the server would refuse once it is marked as restored', () => {
    const restored = restoredPost(copy({ title: 'é'.repeat(250) }));

    expect(Array.from(restored.title)).toHaveLength(255);
    expect(restored.title.startsWith('(Restored) éé')).toBe(true);
  });

  it('ignores authors and tags a damaged copy holds in the wrong shape', () => {
    const damaged = { ...copy(), authors: 'user-1', tags: [null, 'News', { name: 7 }] };

    const restored = restoredPost(damaged as unknown as LocalRevision);

    expect(restored).not.toHaveProperty('authors');
    expect(restored.tags).toEqual([]);
  });
});
