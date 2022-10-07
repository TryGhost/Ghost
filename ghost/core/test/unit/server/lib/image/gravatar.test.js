const should = require('should');
const Gravatar = require('../../../../../core/server/lib/image/gravatar');

describe('lib/image: gravatar', function () {
    const gravatarUrl = 'https://www.gravatar.com/avatar/{hash}?s={size}&r={rating}&d={_default}';

    it('can build a gravatar url', function () {
        const gravatar = new Gravatar({config: {
            isPrivacyDisabled: () => false,
            get: (config) => {
                return config === 'gravatar' ? {
                    url: gravatarUrl
                } : null;
            }
        }, request: () => {}});

        gravatar.url('exists@example.com', {
            size: 180,
            rating: 'r'
        }).should.eql('https://www.gravatar.com/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=180&r=r&d=blank');
    });

    it('can successfully lookup a gravatar url', function (done) {
        const gravatar = new Gravatar({config: {
            isPrivacyDisabled: () => false,
            get: (config) => {
                return config === 'gravatar' ? {
                    url: gravatarUrl
                } : null;
            }
        }, request: () => {}});

        gravatar.lookup({email: 'exists@example.com'}).then(function (result) {
            should.exist(result);
            should.exist(result.image);
            result.image.should.eql('https://www.gravatar.com/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&r=x&d=mp');

            done();
        }).catch(done);
    });

    it('can handle a non existant gravatar', function (done) {
        const gravatar = new Gravatar({config: {
            isPrivacyDisabled: () => false,
            get: (config) => {
                return config === 'gravatar' ? {
                    url: gravatarUrl
                } : null;
            }
        }, request: () => {
            return Promise.reject({statusCode: 404});
        }});

        gravatar.lookup({email: 'invalid@example.com'}).then(function (result) {
            should.exist(result);
            should.not.exist(result.image);

            done();
        }).catch(done);
    });

    it('will timeout', function () {
        const delay = 42;
        const gravatar = new Gravatar({config: {
            isPrivacyDisabled: () => false,
            get: (config) => {
                return config === 'gravatar' ? {
                    url: gravatarUrl
                } : null;
            }
        }, request: (url, options) => {
            options.timeout.should.eql(delay);
        }});

        gravatar.lookup({email: 'exists@example.com'}, delay);
    });
});
