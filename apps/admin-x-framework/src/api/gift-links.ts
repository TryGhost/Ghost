import {createMutation, createQueryWithId} from '../utils/api/hooks';

// A gift link as the admin API emits it. Usage counts (visits/views) are NOT
// stored on the link — they come from the analytics pipeline (see the
// gift-link usage hook in the posts app), so the resource is just the token.
export type GiftLink = {
    token: string;
    created_at: string;
};

export type GiftLinksResponseType = {
    gift_links: GiftLink[];
};

export type RemoveAllGiftLinksResponseType = {
    meta: {
        count: number;
    };
};

// Gift links hang off a post or a page; both map to the same id-keyed,
// type-agnostic controller server-side, but we address the canonical route so
// the resource stays explicit.
export type GiftLinkResource = 'posts' | 'pages';

export type GiftLinkMutationPayload = {
    id: string;
    resource?: GiftLinkResource;
};

const dataType = 'GiftLinksResponseType';

const giftLinkPath = ({id, resource = 'posts'}: GiftLinkMutationPayload) => `/${resource}/${id}/gift_links/`;

// GET /posts/:id/gift_links/ — read the active link for a post without minting
// one (empty when none exists yet). Read-only, so it's safe to fire on render
// (e.g. the analytics gift-link card). Posts only; the analytics screen never
// reads pages.
export const useReadGiftLink = createQueryWithId<GiftLinksResponseType>({
    dataType,
    path: id => giftLinkPath({id})
});

// A post/page has at most one active gift link, so narrow the read above to that
// single link and surface its token directly — callers shouldn't have to reach
// into the response array.
export const useActiveGiftLink = (id: string, options?: Parameters<typeof useReadGiftLink>[1]) => {
    const result = useReadGiftLink(id, options);
    const giftLink = result.data?.gift_links?.[0];
    return {...result, giftLink, token: giftLink?.token};
};

// PUT /:resource/:id/gift_links/ — idempotently ensure (create-or-get) the
// active link, so opening the UI always has a URL to show.
export const useEnsureGiftLink = createMutation<GiftLinksResponseType, GiftLinkMutationPayload>({
    method: 'PUT',
    path: giftLinkPath,
    invalidateQueries: {
        dataType
    }
});

// POST /:resource/:id/gift_links/ — mint a fresh link, invalidating the old
// token. Surfaced in the UI as "reset", but the backend controller is `create`.
export const useCreateGiftLink = createMutation<GiftLinksResponseType, GiftLinkMutationPayload>({
    method: 'POST',
    path: giftLinkPath,
    invalidateQueries: {
        dataType
    }
});

// PUT /gift_links/remove_all/ — site-wide kill switch (Owner/Admin), danger zone.
export const useRemoveAllGiftLinks = createMutation<RemoveAllGiftLinksResponseType, null>({
    method: 'PUT',
    path: () => '/gift_links/remove_all/',
    invalidateQueries: {
        dataType
    }
});
