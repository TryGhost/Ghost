const should = require('should');
const helpers = require('../../../core/frontend/helpers');

describe('{{lang}} helper', function () {
    it('returns correct language tag', function () {
        const locales = [
            'en',
            'en-gb',
            'de'
        ];

        locales.forEach((locale) => {
            const context = {
                hash: {},
                data: {
                    site: {
                        locale
                    }
                }
            };

            let rendered = helpers.lang.call({}, context);

            should.exist(rendered);
            rendered.string.should.equal(locale);
        });
    });
});
