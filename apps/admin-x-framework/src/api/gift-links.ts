import {createMutation, createQueryWithId} from '../utils/api/hooks';

export type GiftLink = {
    id: string;
    post_id: string;
    token: string;
    status: 'active' | 'inactive';
    redeemed_count: number;
    last_redeemed_at: string | null;
    created_at: string;
    updated_at: string | null;
};

export type GiftLinksResponseType = {
    gift_links: GiftLink[];
};

export type ResetAllGiftLinksResponseType = {
    gift_links: {
        reset: number;
    };
};

const dataType = 'GiftLinksResponseType';

// GET /gift_links/:id/ — the active gift link for a post/page (non-creating).
// Returns an empty `gift_links` array when nothing has been shared yet.
export const useGiftLinkForPost = createQueryWithId<GiftLinksResponseType>({
    dataType,
    path: id => `/gift_links/${id}/`
});

// POST /gift_links/:id/ — idempotently ensure (create-or-get) the active link.
// Called by the "copy" action so a row reliably signals a copy.
export const useEnsureGiftLink = createMutation<GiftLinksResponseType, {id: string}>({
    method: 'POST',
    path: ({id}) => `/gift_links/${id}/`,
    invalidateQueries: {
        dataType
    }
});

// PUT /gift_links/:id/reset/ — invalidate the active link and mint a fresh one.
export const useResetGiftLink = createMutation<GiftLinksResponseType, {id: string}>({
    method: 'PUT',
    path: ({id}) => `/gift_links/${id}/reset/`,
    invalidateQueries: {
        dataType
    }
});

// PUT /gift_links/reset_all/ — site-wide kill switch (Owner/Admin), danger zone.
export const useResetAllGiftLinks = createMutation<ResetAllGiftLinksResponseType, object>({
    method: 'PUT',
    path: () => '/gift_links/reset_all/',
    invalidateQueries: {
        dataType
    }
});
