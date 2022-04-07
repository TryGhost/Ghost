const should = require('should');
const sinon = require('sinon');
const getNewslettersServiceInstance = require('../../../../../core/server/services/newsletters');
const models = require('../../../../../core/server/models');

describe('Newsletters Service', function () {
    before(function () {
        models.init();
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

            const NewslettersService = getNewslettersServiceInstance({NewsletterModel: models.Newsletter});
            const newsletters = await NewslettersService.browse({});
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
