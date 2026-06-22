import {createMutation, createQueryWithId} from '../utils/api/hooks';

export type GiftLink = {
    id: string;
    post_id: string;
    token: string;
    status: string;
    redeemed_count: number;
    last_redeemed_at: string | null;
    created_at: string;
    updated_at: string;
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

// GET /gift_links/:postId/ — read the active gift link for a post (may be empty).
export const useReadGiftLink = createQueryWithId<GiftLinksResponseType>({
    dataType,
    path: postId => `/gift_links/${postId}/`
});

// POST /gift_links/:postId/ — idempotently ensure (create-or-get) the active link.
export const useEnsureGiftLink = createMutation<GiftLinksResponseType, string>({
    method: 'POST',
    path: postId => `/gift_links/${postId}/`,
    invalidateQueries: {
        dataType
    }
});

// PUT /gift_links/:postId/reset/ — rotate the active link (invalidates the old token).
export const useResetGiftLink = createMutation<GiftLinksResponseType, string>({
    method: 'PUT',
    path: postId => `/gift_links/${postId}/reset/`,
    invalidateQueries: {
        dataType
    }
});

// PUT /gift_links/reset_all/ — site-wide kill switch (Owner/Admin), danger zone.
export const useResetAllGiftLinks = createMutation<ResetAllGiftLinksResponseType, null>({
    method: 'PUT',
    path: () => '/gift_links/reset_all/',
    invalidateQueries: {
        dataType
    }
});
