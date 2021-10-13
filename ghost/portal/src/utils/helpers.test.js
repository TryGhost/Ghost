import {getPriceIdFromPageQuery} from './helpers';
import {site} from './fixtures';

describe('Helpers - ', () => {
    test('can correctly fetch price id from page query ', () => {
        const mockPriceIdFn = jest.fn(getPriceIdFromPageQuery);
        const value = mockPriceIdFn({site, pageQuery: 'product_1/yearly'});
        expect(value).toBe('6086eff0823dd7345afc8083');
    });
});
