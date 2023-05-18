const errors = require('@tryghost/errors');
const validators = require('../../../lib/validators/controller');

describe('validators/controller/configuration', function () {
    describe('headers', function () {
        it('rejects if the cacheInvalidate header is not provided', function () {
            const apiImpl = {
                headers: {}
            };

            return validators.configuration.headers(apiImpl)
                .then(Promise.reject)
                .catch((err) => {
                    (err instanceof errors.IncorrectUsageError).should.be.true();
                });
        });
    });
});
