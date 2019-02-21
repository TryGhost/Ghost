const should = require('should');
const converters = require('../../../../../server/lib/mobiledoc/converters');

describe('Unit: lib/mobiledoc/converters', function () {
    describe('htmlToMobiledocConverter should be unsupported in node v6', function () {
        before(function () {
            if (!process.version.startsWith('v6.')) {
                this.skip();
            }
        });

        it('should throw when running on node v6', function () {
            try {
                const thrower = converters.htmlToMobiledocConverter();
                thrower();
                throw new Error('should not execute');
            } catch (err) {
                err.message.should.equal('Unable to convert from source HTML to Mobiledoc');
            }
        });
    });
});
