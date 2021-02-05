import Service from '@ember/service';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import sinon from 'sinon';
import {beforeEach, describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

const mockAjax = Service.extend({
    skipSessionDeletion: false,
    init() {
        this._super(...arguments);
        this.post = sinon.stub().resolves();
        this.del = sinon.stub().resolves();
    }
});

const mockConfig = Service.extend({
    init() {
        this._super(...arguments);
        this.fetchAuthenticated = sinon.stub().resolves();
    }
});

const mockFeature = Service.extend({
    init() {
        this._super(...arguments);
        this.fetch = sinon.stub().resolves();
    }
});

const mockSettings = Service.extend({
    init() {
        this._super(...arguments);
        this.fetch = sinon.stub().resolves();
    }
});

const mockTour = Service.extend({
    init() {
        this._super(...arguments);
        this.fetchViewed = sinon.stub().resolves();
    }
});

const mockGhostPaths = Service.extend({
    apiRoot: ghostPaths().apiRoot
});

describe('Unit: Authenticator: cookie', () => {
    setupTest();

    beforeEach(function () {
        this.owner.register('service:ajax', mockAjax);
        this.owner.register('service:config', mockConfig);
        this.owner.register('service:feature', mockFeature);
        this.owner.register('service:settings', mockSettings);
        this.owner.register('service:tour', mockTour);
        this.owner.register('service:ghost-paths', mockGhostPaths);
    });

    describe('#restore', function () {
        it('returns a resolving promise', function () {
            return this.owner.lookup('authenticator:cookie').restore();
        });
    });

    describe('#authenticate', function () {
        it('posts the username and password to the sessionEndpoint and returns the promise', function () {
            let authenticator = this.owner.lookup('authenticator:cookie');
            let post = authenticator.ajax.post;

            let config = this.owner.lookup('service:config');
            let feature = this.owner.lookup('service:feature');
            let settings = this.owner.lookup('service:settings');
            let tour = this.owner.lookup('service:tour');

            return authenticator.authenticate('AzureDiamond', 'hunter2').then(() => {
                expect(post.args[0][0]).to.equal(`${ghostPaths().apiRoot}/session`);
                expect(post.args[0][1]).to.deep.include({
                    data: {
                        username: 'AzureDiamond',
                        password: 'hunter2'
                    }
                });
                expect(post.args[0][1]).to.deep.include({
                    dataType: 'text'
                });
                expect(post.args[0][1]).to.deep.include({
                    contentType: 'application/json;charset=utf-8'
                });

                // ensure our pre-loading calls have been made
                expect(config.fetchAuthenticated.calledOnce, 'config.fetchAuthenticated called').to.be.true;
                expect(feature.fetch.calledOnce, 'feature.fetch called').to.be.true;
                expect(settings.fetch.calledOnce, 'settings.fetch called').to.be.true;
                expect(tour.fetchViewed.calledOnce, 'tour.fetchViewed called').to.be.true;
            });
        });
    });

    describe('#invalidate', function () {
        it('makes a delete request to the sessionEndpoint', function () {
            let authenticator = this.owner.lookup('authenticator:cookie');
            let del = authenticator.ajax.del;

            return authenticator.invalidate().then(() => {
                expect(del.args[0][0]).to.equal(`${ghostPaths().apiRoot}/session`);
            });
        });
    });
});
