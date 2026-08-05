import {getPost} from '@tryghost/admin-x-framework/api/posts';
import {readPublishCelebration, type PublishCelebration} from '@/posts/list/post-publish-celebration';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useEffect, useRef, useState} from 'react';

/**
 * The post-publish celebration, ported from `checkPublishFlowModal` in
 * `apps/ember-admin/app/components/posts-list/list.js`.
 *
 * The Ember editor writes a localStorage key and navigates here; the list reads
 * it on mount. The editor stays Ember on both sides of the flag, so only the
 * reader moved.
 */
export function usePostPublishCelebration() {
    /**
     * Read once, on mount, and cleared in the same breath — see
     * `readPublishCelebration`. Held in state rather than re-read, because the
     * key is gone by the second render.
     */
    const [celebration, setCelebration] = useState<PublishCelebration | null>(null);

    /**
     * The read is single-shot — it clears the key as it goes — and StrictMode
     * invokes effects twice on mount. Without this guard the first invocation
     * consumes the key and sets the state, and the second reads nothing and
     * clobbers it back to null, so the celebration never appears at all.
     *
     * A ref rather than a module-level flag: it survives the double-invoke
     * (same component instance) while still letting a genuinely new mount —
     * publishing a second post — read a fresh key.
     */
    const hasRead = useRef(false);

    useEffect(() => {
        if (hasRead.current) {
            return;
        }

        hasRead.current = true;
        setCelebration(readPublishCelebration());
    }, []);

    const {data: postData} = getPost(celebration?.id ?? '', {enabled: Boolean(celebration)});

    /**
     * The total published count, for "That's 47 posts published."
     *
     * Deliberately not blocking the modal: Ember awaits it, which delays the
     * celebration behind a second request. The copy falls back to "Spread the
     * word!" until it lands, which is a wording Ember also uses.
     */
    const {data: countData} = useBrowsePosts({
        searchParams: {filter: 'status:published', limit: '1'},
        enabled: celebration?.wasPublished === true
    });

    const post = postData?.posts?.[0];

    return {
        celebration,
        post,
        postCount: celebration?.wasPublished ? countData?.meta?.pagination.total : undefined,
        dismiss: () => {
            setCelebration(null);
        }
    };
}
