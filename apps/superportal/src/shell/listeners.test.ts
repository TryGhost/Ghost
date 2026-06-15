import {describe, it, expect} from 'vitest';
import {parsePortalAction} from './listeners';

describe('parsePortalAction', () => {
    it('routes gift redemption tokens', () => {
        expect(parsePortalAction('gift/redeem/abc%20123')).toEqual({
            feature: 'gift',
            params: {giftToken: 'abc 123'}
        });
    });

    it('routes bare gift to the purchase view', () => {
        expect(parsePortalAction('gift')).toEqual({feature: 'gift', params: {}});
    });

    it('routes offers with a code', () => {
        expect(parsePortalAction('offer/deal42')).toEqual({feature: 'offers', params: {code: 'deal42'}});
    });
});
