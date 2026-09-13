import Service from '@ember/service';
import sinon from 'sinon';
import {afterEach, describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Route: lexical-editor', function () {
    setupTest();

    afterEach(function () {
        sinon.restore();
    });

    function setupRoute(owner) {
        class SessionStub extends Service {
            isAuthenticated = true;
            requireAuthentication = sinon.spy();
        }
        class FeatureStub extends Service {
            editorReact = false;
        }
        owner.register('service:session', SessionStub);
        owner.register('service:feature', FeatureStub);

        const route = owner.lookup('route:lexical-editor');
        const ui = owner.lookup('service:ui');
        sinon.spy(ui, 'set');

        return {route, ui};
    }

    it('hides the sidebar before loading the Ember editor', function () {
        const {route, ui} = setupRoute(this.owner);
        const transition = {intent: {url: '/editor/post/1'}};

        route.beforeModel(transition);

        expect(ui.isFullScreen, 'full-screen mode enabled before model loading').to.be.true;
        expect(ui.set.calledOnceWith('isFullScreen', true), 'full-screen mode enabled once').to.be.true;
    });
});
