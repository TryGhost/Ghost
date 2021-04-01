// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const {MaxLimit} = require('../lib/limit');

describe('Limit Service', function () {
    describe('Max Limit', function () {
        it('throws if initialized without a max limit', function () {
            const config = {};

            try {
                const limit = new MaxLimit({name: 'no limits!', config});
                should.fail(limit, 'Should have errored');
            } catch (err) {
                should.exist(err);
                should.exist(err.errorType);
                should.equal(err.errorType, 'IncorrectUsageError');
            }
        });

        it('throws if initialized without a current count query', function () {
            const config = {};

            try {
                const limit = new MaxLimit({name: 'no accountability!', config});
                should.fail(limit, 'Should have errored');
            } catch (err) {
                should.exist(err);
                should.exist(err.errorType);
                should.equal(err.errorType, 'IncorrectUsageError');
            }
        });

        it('throws if would go over the limit', async function () {
            const config = {
                max: 1,
                currentCountQuery: () => 1
            };
            const limit = new MaxLimit({name: 'maxy', config});

            try {
                await limit.errorIfWouldGoOverLimit();
                should.fail(limit, 'Should have errored');
            } catch (err) {
                should.exist(err);

                should.exist(err.errorType);
                should.equal(err.errorType, 'HostLimitError');

                should.exist(err.errorDetails);
                should.equal(err.errorDetails.name, 'maxy');

                should.exist(err.message);
                should.equal(err.message, 'This action would exceed the maxy limit on your current plan.');
            }
        });

        it('passes if does not go over the limit', async function () {
            const config = {
                max: 2,
                currentCountQuery: () => 1
            };

            const limit = new MaxLimit({name: 'maxy', config});

            await limit.errorIfWouldGoOverLimit();
        });
    });
});
