import {getPriceIdFromPageQuery} from './helpers';
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
});
