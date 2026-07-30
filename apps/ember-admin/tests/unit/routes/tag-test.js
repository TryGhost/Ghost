import Service from '@ember/service';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Route: tag', function () {
    setupTest();

    afterEach(function () {
        sinon.restore();
    });

    it('aborts the Ember transition when React owns the tag detail route', function () {
        const requireAuthentication = sinon.spy();
        class SessionStub extends Service {
            isAuthenticated = true;
            user = {isAuthorOrContributor: false};
            requireAuthentication = requireAuthentication;
        }
        class FeatureStub extends Service {
            tagDetailsReact = true;
        }
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:feature', FeatureStub);

        const route = this.owner.lookup('route:tag');
        const transition = {abort: sinon.spy()};

        route.beforeModel(transition);

        expect(requireAuthentication.calledOnce).to.be.true;
        expect(transition.abort.calledOnce).to.be.true;
    });

    it('keeps Ember ownership when the feature flag is not a boolean', function () {
        class SessionStub extends Service {
            isAuthenticated = true;
            user = {isAuthorOrContributor: false};
            requireAuthentication = sinon.spy();
        }
        class FeatureStub extends Service {
            tagDetailsReact = 'true';
        }
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:feature', FeatureStub);

        const route = this.owner.lookup('route:tag');
        const transition = {abort: sinon.spy()};

        route.beforeModel(transition);

        expect(transition.abort.called).to.be.false;
    });
});
