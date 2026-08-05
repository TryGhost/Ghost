import {afterEach, describe, expect, it} from 'vitest';
import {readPublishCelebration} from './post-publish-celebration';

/**
 * The editor→list handoff, ported from `checkPublishFlowModal` in
 * `apps/ember-admin/app/components/posts-list/list.js`.
 */
afterEach(() => {
    localStorage.clear();
});

describe('readPublishCelebration', () => {
    it('reads a published post', () => {
        localStorage.setItem('ghost-last-published-post', JSON.stringify({id: 'p1', type: 'post'}));

        expect(readPublishCelebration()).toEqual({id: 'p1', type: 'post', wasPublished: true});
    });

    it('reads a scheduled post', () => {
        localStorage.setItem('ghost-last-scheduled-post', JSON.stringify({id: 'p2', type: 'post'}));

        expect(readPublishCelebration()).toEqual({id: 'p2', type: 'post', wasPublished: false});
    });

    it('reads a page', () => {
        localStorage.setItem('ghost-last-published-post', JSON.stringify({id: 'g1', type: 'page'}));

        expect(readPublishCelebration()?.type).toBe('page');
    });

    it('is nothing when neither key is set', () => {
        expect(readPublishCelebration()).toBeNull();
    });

    /**
     * The key is cleared as it is read, *before* anything is fetched. Ember
     * clears it after the modal opens, so a failed request leaves the key in
     * place and the celebration re-fires on every visit to the list until it
     * happens to succeed.
     */
    it('clears the key as it reads it', () => {
        localStorage.setItem('ghost-last-published-post', JSON.stringify({id: 'p1', type: 'post'}));

        readPublishCelebration();

        expect(localStorage.getItem('ghost-last-published-post')).toBeNull();
        expect(readPublishCelebration()).toBeNull();
    });

    // Whatever wrote this is gone; the only sane thing is to drop it rather
    // than throw on every mount of the list for the rest of the session.
    it('discards an unparseable entry, and clears it', () => {
        localStorage.setItem('ghost-last-published-post', 'not json');

        expect(readPublishCelebration()).toBeNull();
        expect(localStorage.getItem('ghost-last-published-post')).toBeNull();
    });

    it('discards an entry with no id', () => {
        localStorage.setItem('ghost-last-published-post', JSON.stringify({type: 'post'}));

        expect(readPublishCelebration()).toBeNull();
    });

    // Published wins if both are somehow set, matching Ember's order — though
    // it opens two modals in that case and we open one.
    it('prefers the published entry when both are set', () => {
        localStorage.setItem('ghost-last-published-post', JSON.stringify({id: 'p1', type: 'post'}));
        localStorage.setItem('ghost-last-scheduled-post', JSON.stringify({id: 'p2', type: 'post'}));

        expect(readPublishCelebration()?.id).toBe('p1');
        // ...and both are cleared, so the other cannot fire on the next mount.
        expect(localStorage.getItem('ghost-last-scheduled-post')).toBeNull();
    });
});
