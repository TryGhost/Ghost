const sinon = require('sinon');
const models = require('../../../server/models');
const configUtils = require('../../utils/configUtils');

const config = configUtils.config;

describe('Unit: models/member', function () {
    before(function () {
        models.init();
    });

    beforeEach(function () {
        config.set('assetHash', '1');
    });

    afterEach(function () {
        configUtils.restore();
        sinon.restore();
    });

    describe('toJSON', function () {
        let toJSON;

        beforeEach(function () {
            toJSON = function toJSON(model, options) {
                return new models.Member(model).toJSON(options);
            };
        });

        it('avatar_image: generates gravatar url with fallback', function () {
            const member = {
                email: 'test@example.com'
            };

            config.set('privacy:useGravatar', true);
            const json = toJSON(member);

            should.exist(json.avatar_image);
            const encodedFallbackImage = encodeURIComponent('https://127.0.0.1:2369/assets/default-member-avatar.png?v=1');
            json.avatar_image.should.eql(`https://gravatar.com/avatar/55502f40dc8b7c769880b10874abc9d0?s=250&d=${encodedFallbackImage}`);
        });

        it('avatar_image: skips gravatar when privacy.useGravatar=false', function () {
            const member = {
                email: 'test@example.com'
            };

            config.set('privacy:useGravatar', false);
            const json = toJSON(member);

            should.exist(json.avatar_image);
            json.avatar_image.should.eql('https://127.0.0.1:2369/assets/default-member-avatar.png?v=1');
        });
    });
});
