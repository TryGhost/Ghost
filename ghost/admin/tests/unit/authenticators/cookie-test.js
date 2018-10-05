import RSVP from 'rsvp';
import Service from '@ember/service';
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

const mockGhostPaths = Service.extend({
    apiRoot: '/ghost/api/v2/admin'
});

describe('Unit: Authenticator: cookie', () => {
    setupTest('authenticator:cookie', {});

    beforeEach(function () {
        this.register('service:ajax', mockAjax);
        this.inject.service('ajax', {as: 'ajax'});

        this.register('service:ghost-paths', mockGhostPaths);
        this.inject.service('ghost-paths', {as: 'ghostPaths'});
    });

    describe('#restore', function () {
        it('returns a resolving promise', function () {
            return this.subject().restore();
        });
    });

    describe('#authenticate', function () {
        it('posts the username and password to the sessionEndpoint and returns the promise', function () {
            let authenticator = this.subject();
            let post = authenticator.ajax.post;

            return authenticator.authenticate('AzureDiamond', 'hunter2').then(() => {
                expect(post.args[0][0]).to.equal('/ghost/api/v2/admin/session');
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
            });
        });
    });

    describe('#invalidate', function () {
        it('makes a delete request to the sessionEndpoint', function () {
            let authenticator = this.subject();
            let del = authenticator.ajax.del;

            return authenticator.invalidate().then(() => {
                expect(del.args[0][0]).to.equal('/ghost/api/v2/admin/session');
            });
        });
    });
});
