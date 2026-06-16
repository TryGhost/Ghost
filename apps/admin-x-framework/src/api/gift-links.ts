import {createMutation} from '../utils/api/hooks';

export type RevokeAllGiftLinksResponseType = {
    meta: {
        count: number;
    };
};

const dataType = 'GiftLinksResponseType';

// PUT /gift_links/revoke_all/ — site-wide kill switch (Owner/Admin), danger zone.
export const useRevokeAllGiftLinks = createMutation<RevokeAllGiftLinksResponseType, null>({
    method: 'PUT',
    path: () => '/gift_links/revoke_all/',
    invalidateQueries: {
        dataType
    }
});
