const sinon = require('sinon');
const models = require('../../../../core/server/models');

// The /email/<uuid>/ landing page handler returns a post that gets rendered
// via mappers.posts → url.forPost → urlService.facade.getUrlForResource.
// Under lazyRouting that call evaluates each router's NQL filter against
// the loaded record; without tags/authors a tag- or author-filtered route
// resolves to /404/ for the post URL embedded in the rendered page.

describe('email-post endpoint', function () {
    let findOneStub;
    let controller;

    beforeEach(function () {
        findOneStub = sinon.stub(models.Post, 'findOne').resolves({});
        delete require.cache[require.resolve('../../../../core/server/api/endpoints/email-post')];
        controller = require('../../../../core/server/api/endpoints/email-post');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('read', function () {
        it('loads tags and authors so URL serialization can resolve filtered routes under lazyRouting', async function () {
            const frame = {
                data: {uuid: 'some-uuid'},
                options: {}
            };
            await controller.read.query(frame);
            sinon.assert.calledOnce(findOneStub);
            const callOptions = findOneStub.firstCall.args[1];
            const withRelated = callOptions?.withRelated || [];
            const includes = callOptions?.include || [];
            const loaded = [...withRelated, ...(typeof includes === 'string' ? includes.split(',') : includes)];
            sinon.assert.match(loaded, sinon.match.array.contains(['tags']));
            sinon.assert.match(loaded, sinon.match.array.contains(['authors']));
        });
    });
});
