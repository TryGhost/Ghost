const assert = require('node:assert/strict');
const sinon = require('sinon');
const labs = require('../../../../../core/shared/labs');
const giftLinksService = require('../../../../../core/server/services/gift-links');
const {loadGiftLink} = require('../../../../../core/server/services/gift-links/middleware');

describe('Unit: gift-links/middleware loadGiftLink', function () {
    let req;
    let res;
    let next;
    let setStub;

    beforeEach(function () {
        req = {query: {}};
        setStub = sinon.stub();
        res = {locals: {}, set: setStub};
        next = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
        delete giftLinksService.api;
    });

    it('no-ops when there is no gift param', async function () {
        await loadGiftLink(req, res, next);

        sinon.assert.calledOnce(next);
        sinon.assert.notCalled(setStub);
        assert.equal(res.locals.giftLink, undefined);
    });

    it('no-ops (no headers, no grant) when the flag is disabled', async function () {
        req.query.gift = 'tok';
        sinon.stub(labs, 'isSet').returns(false);

        await loadGiftLink(req, res, next);

        sinon.assert.notCalled(setStub);
        assert.equal(res.locals.giftLink, undefined);
        sinon.assert.calledOnce(next);
    });

    it('sets noindex + referrer headers and grants for a valid token', async function () {
        req.query.gift = 'tok';
        sinon.stub(labs, 'isSet').withArgs('giftLinks').returns(true);
        giftLinksService.api = {
            getActiveByToken: sinon.stub().resolves({id: 'gl1', get: () => 'post-1'})
        };

        await loadGiftLink(req, res, next);

        sinon.assert.calledWith(setStub, 'X-Robots-Tag', 'noindex');
        sinon.assert.calledWith(setStub, 'Referrer-Policy', 'no-referrer');
        assert.deepEqual(res.locals.giftLink, {id: 'gl1', post_id: 'post-1', token: 'tok'});
        sinon.assert.calledOnce(next);
    });

    it('ignores a non-string gift param (e.g. ?gift[$ne]= object/array)', async function () {
        req.query.gift = {$ne: 'x'};
        const isSetStub = sinon.stub(labs, 'isSet').returns(true);

        await loadGiftLink(req, res, next);

        // Short-circuits before the flag check and any DB lookup
        sinon.assert.notCalled(isSetStub);
        sinon.assert.notCalled(setStub);
        assert.equal(res.locals.giftLink, undefined);
        sinon.assert.calledOnce(next);
    });

    it('sets headers but no grant for an invalid/unknown token', async function () {
        req.query.gift = 'bad';
        sinon.stub(labs, 'isSet').withArgs('giftLinks').returns(true);
        giftLinksService.api = {getActiveByToken: sinon.stub().resolves(null)};

        await loadGiftLink(req, res, next);

        sinon.assert.calledWith(setStub, 'X-Robots-Tag', 'noindex');
        assert.equal(res.locals.giftLink, undefined);
        sinon.assert.calledOnce(next);
    });
});
