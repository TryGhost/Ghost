const should = require('should');
const sinon = require('sinon');

const PostLinkRepository = require('../../../../../core/server/services/link-tracking/PostLinkRepository');

describe('UNIT: PostLinkRepository class', function () {
    let postLinkRepository;

    before(function () {
        postLinkRepository = new PostLinkRepository({
            LinkRedirect: {
                getFilteredCollectionQuery: sinon.stub().returns({
                    select: sinon.stub().returns({
                        distinct: sinon.stub().returns([])
                    })
                }),
                bulkEdit: sinon.stub().returns({
                    successful: 0,
                    unsuccessful: 0,
                    errors: [],
                    unsuccessfulData: []
                })
            },
            linkRedirectRepository: {}
        });
    });

    beforeEach(function () {
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('updateLinks', function () {
        it('should return correct response format', async function () {
            const links = await postLinkRepository.updateLinks(['abc'], {
                to: 'https://example.com',
                updated_at: new Date('2022-10-20T00:00:00.000Z')
            }, {});
            should(links).eql({
                bulk: {
                    action: 'updateLink',
                    meta: {
                        stats: {
                            successful: 0,
                            unsuccessful: 0
                        },
                        errors: [],
                        unsuccessfulData: []
                    }
                }
            });
        });
    });
});
