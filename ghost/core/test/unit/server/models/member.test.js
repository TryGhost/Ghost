const sinon = require('sinon');
const models = require('../../../../core/server/models');
const configUtils = require('../../../utils/configUtils');

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
            toJSON = function (model, options) {
                return new models.Member(model).toJSON(options);
            };
        });

        it('avatar_image: generates gravatar url', function () {
            const member = {
                email: 'test@example.com'
            };

            config.set('privacy:useGravatar', true);
            const json = toJSON(member);

            json.avatar_image.should.eql(`https://www.gravatar.com/avatar/55502f40dc8b7c769880b10874abc9d0?s=250&r=g&d=blank`);
        });

        it('avatar_image: skips gravatar when privacy.useGravatar=false', function () {
            const member = {
                email: 'test@example.com'
            };

            config.set('privacy:useGravatar', false);
            const json = toJSON(member);

            should(json.avatar_image).eql(null);
        });
    });
});
