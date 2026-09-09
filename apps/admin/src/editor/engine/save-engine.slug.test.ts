import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TITLE } from './save-engine';
import { flush, FUTURE, PAST, setup } from './__test-utils__/engine-harness';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createSaveEngine', () => {
  describe('prepare stage: title and slug', () => {
    it('serializes an explicit save behind manual slug work in progress', async () => {
      const h = setup();
      const release = h.holdSlugWork();

      const explicit = h.engine.dispatch('explicit');
      await flush();
      expect(h.engine.getState()).toEqual({ kind: 'saving', intent: 'explicit' });
      expect(h.execute).not.toHaveBeenCalled();

      await release();
      expect(h.execute).toHaveBeenCalledTimes(1);
      await h.succeed();
      await expect(explicit).resolves.toMatchObject({ kind: 'saved' });
    });

    it('waits for a slow slug request before a leave save leaves', async () => {
      const h = setup({ slug: '' });
      h.holdSlugRequests();
      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.slug.fromTitle).toHaveBeenCalledWith('Hello', 'post-1', expect.any(AbortSignal));
      expect(h.execute).not.toHaveBeenCalled();

      await h.resolveSlug('hello');
      expect(h.requests[0]).toMatchObject({ command: { kind: 'leave' }, slug: 'hello' });

      await h.succeed();
      await expect(decision).resolves.toBe('proceed');
    });

    it('creates a titleless body-first post as (Untitled) with a generated slug', async () => {
      const h = setup({ id: null, updatedAt: null, title: '', slug: '' });
      h.holdSlugRequests();
      void h.engine.dispatch('autosave');
      await flush();
      expect(h.slug.fromTitle).toHaveBeenCalledWith(DEFAULT_TITLE, null, expect.any(AbortSignal));

      await h.resolveSlug('untitled');
      expect(h.requests[0]).toMatchObject({
        title: DEFAULT_TITLE,
        slug: 'untitled',
        target: { status: 'draft' },
        snapshot: { id: null, title: '' },
      });
    });

    it('treats a whitespace title as blank', async () => {
      const h = setup({ id: null, updatedAt: null, title: '   ', slug: '' });
      h.holdSlugRequests();
      void h.engine.dispatch('explicit');
      await flush();
      expect(h.slug.fromTitle).toHaveBeenCalledWith(DEFAULT_TITLE, null, expect.any(AbortSignal));

      await h.resolveSlug('untitled');
      expect(h.requests[0]).toMatchObject({ title: DEFAULT_TITLE, slug: 'untitled' });
    });

    it('applies a generated proposal requested with the post id', async () => {
      const h = setup({ title: 'Hello world' });
      h.holdSlugRequests();
      void h.engine.dispatch('explicit');
      await flush();
      expect(h.slug.fromTitle).toHaveBeenCalledWith(
        'Hello world',
        'post-1',
        expect.any(AbortSignal),
      );

      await h.resolveSlug('hello-world-2');
      expect(h.requests[0]).toMatchObject({ slug: 'hello-world-2', snapshot: { id: 'post-1' } });
      await h.succeed();
      expect(h.snapshot.slug).toBe('hello-world-2');
    });

    it('sends the slug current after an unchanged answer, not the one read before the request', async () => {
      const h = setup({ slug: 'my-slug' });
      h.holdSlugRequests();
      void h.engine.dispatch('explicit');
      await flush();

      h.patch({ slug: 'my-custom-slug' });
      await h.resolveSlug('ignored', 'unchanged');
      expect(h.requests[0]).toMatchObject({
        slug: 'my-custom-slug',
        snapshot: { slug: 'my-custom-slug' },
      });
    });

    it('asks the slug port on every draft save and lets it keep the slug', async () => {
      const h = setup({ title: '' });
      void h.engine.dispatch('explicit');
      await flush();

      expect(h.slug.fromTitle).toHaveBeenCalledWith(
        DEFAULT_TITLE,
        'post-1',
        expect.any(AbortSignal),
      );
      expect(h.requests[0]).toMatchObject({ title: DEFAULT_TITLE, slug: 'hello' });
    });

    it('never asks for a slug when a non-draft post already has one', async () => {
      const h = setup({ status: 'published', publishedAt: PAST, title: 'Renamed' });
      void h.engine.dispatch('explicit');
      await flush();

      expect(h.slug.fromTitle).not.toHaveBeenCalled();
      expect(h.requests[0]).toMatchObject({ slug: 'hello' });
    });

    it('asks for a slug for a post of any status that has none', async () => {
      const h = setup({ status: 'published', publishedAt: PAST, slug: '' });
      h.holdSlugRequests();
      void h.engine.dispatch('explicit');
      await flush();

      expect(h.slug.fromTitle).toHaveBeenCalledWith('Hello', 'post-1', expect.any(AbortSignal));
      await h.resolveSlug('hello');
      expect(h.requests[0]).toMatchObject({ slug: 'hello' });
    });

    it('drops a background save whose post was published during the slug request', async () => {
      const h = setup();
      h.holdSlugRequests();
      const field = h.engine.dispatch('field');
      await flush();

      h.patch({ status: 'published', publishedAt: PAST, updatedAt: FUTURE });
      await h.resolveSlug('hello', 'unchanged');
      expect(h.prepare).not.toHaveBeenCalled();
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
      await expect(field).resolves.toEqual({ kind: 'dropped', reason: 'not-draft' });
    });

    it('drops a background save whose post went clean during the slug request', async () => {
      const h = setup();
      h.holdSlugRequests();
      const field = h.engine.dispatch('field');
      await flush();

      h.patch({ isDirty: false });
      await h.resolveSlug('hello', 'unchanged');
      expect(h.prepare).not.toHaveBeenCalled();
      expect(h.execute).not.toHaveBeenCalled();
      await expect(field).resolves.toEqual({ kind: 'dropped', reason: 'clean' });
    });

    it('never prepares a save disposed while slug work was settling', async () => {
      const h = setup();
      const release = h.holdSlugWork();
      const explicit = h.engine.dispatch('explicit');
      await flush();

      h.engine.dispose();
      await expect(explicit).resolves.toEqual({ kind: 'dropped', reason: 'disposed' });
      await release();
      expect(h.prepare).not.toHaveBeenCalled();
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('never prepares a save disposed while a slug proposal was pending', async () => {
      const h = setup();
      h.holdSlugRequests();
      const explicit = h.engine.dispatch('explicit');
      await flush();
      expect(h.slug.fromTitle).toHaveBeenCalledTimes(1);

      h.engine.dispose();
      await expect(explicit).resolves.toEqual({ kind: 'dropped', reason: 'disposed' });
      await h.resolveSlug('late');
      expect(h.prepare).not.toHaveBeenCalled();
      expect(h.execute).not.toHaveBeenCalled();
    });
  });
});
