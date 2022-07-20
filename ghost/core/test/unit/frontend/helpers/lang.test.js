const should = require('should');
const lang = require('../../../../core/frontend/helpers/lang');

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

            let rendered = lang.call({}, context);

            should.exist(rendered);
            rendered.string.should.equal(locale);
        });
    });
});
