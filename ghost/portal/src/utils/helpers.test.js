import {getPriceIdFromPageQuery, isSameCurrency} from './helpers';
import * as Fixtures from './fixtures';

describe('Helpers - ', () => {
    test('can correctly fetch price id from page query ', () => {
        const mockPriceIdFn = getPriceIdFromPageQuery;
        const siteData = Fixtures.getSiteData();
        const testProduct = siteData.products?.[0];
        const pageQuery = `${testProduct?.id}/yearly`;
        const expectedPriceId = testProduct.yearlyPrice.id;
        const value = mockPriceIdFn({site: siteData, pageQuery});
        expect(value).toBe(expectedPriceId);
    });
    describe('isSameCurrency - ', () => {
        test('can match two currencies correctly ', () => {
            let currency1 = 'USD';
            let currency2 = 'USD';
            expect(isSameCurrency(currency1, currency2)).toBe(true);
        });
        test('can match currencies with case mismatch', () => {
            let currency1 = 'USD';
            let currency2 = 'usd';
            expect(isSameCurrency(currency1, currency2)).toBe(true);
        });
        test('can match currencies with case mismatch', () => {
            let currency1 = 'eur';
            let currency2 = 'usd';
            expect(isSameCurrency(currency1, currency2)).toBe(false);
        });
    });
});
