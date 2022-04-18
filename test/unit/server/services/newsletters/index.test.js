const should = require('should');
const sinon = require('sinon');
const models = require('../../../../../core/server/models');

describe('Newsletters Service', function () {
    let newslettersService;

    before(function () {
        models.init();
        newslettersService = require('../../../../../core/server/services/newsletters');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('browse', function () {
        it('lists all newsletters', async function () {
            const findAllStub = {
                toJSON: function () {
                    return [
                        {
                            id: 'newsletter-1'
                        },
                        {
                            id: 'newsletter-2'
                        }
                    ];
                }
            };
            sinon.stub(models.Newsletter, 'findAll').returns(Promise.resolve(findAllStub));

            const newsletters = await newslettersService.browse({});
            should(newsletters).deepEqual([
                {
                    id: 'newsletter-1'
                },
                {
                    id: 'newsletter-2'
                }
            ]);
        });
    });
});
