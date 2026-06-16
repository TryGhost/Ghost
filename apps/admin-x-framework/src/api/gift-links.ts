import {createMutation} from '../utils/api/hooks';

export type ResetAllGiftLinksResponseType = {
    gift_links: {
        reset: number;
    };
};

const dataType = 'GiftLinksResponseType';

// PUT /gift_links/reset_all/ — site-wide kill switch (Owner/Admin), danger zone.
export const useResetAllGiftLinks = createMutation<ResetAllGiftLinksResponseType, null>({
    method: 'PUT',
    path: () => '/gift_links/reset_all/',
    invalidateQueries: {
        dataType
    }
});
