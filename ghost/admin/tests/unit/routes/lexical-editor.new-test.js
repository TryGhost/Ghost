import * as Sentry from '@sentry/ember';
import sentryTestkit from 'sentry-testkit/browser';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {getSentryTestConfig} from 'ghost-admin/utils/sentry';
import {run} from '@ember/runloop';
import {setupTest} from 'ember-mocha';
import {waitUntil} from '@ember/test-helpers';

const {sentryTransport, testkit} = sentryTestkit();

describe('Unit: Route: lexical-editor.new', function () {
    setupTest();

    let controller;
    let route;
    let createRecordStub;
    let reloadStub;

    before(function () {
        Sentry.init(getSentryTestConfig(sentryTransport));
    });

    beforeEach(async function () {
        // ensure tags don't leak in from earlier (esp. acceptance) tests
        Sentry.getCurrentHub().getIsolationScope().clear();
        Sentry.getCurrentScope().clear();

        testkit.reset();

        controller = this.owner.lookup('controller:lexical-editor');
        route = this.owner.lookup('route:lexical-editor.new');
        createRecordStub = sinon.stub(route.store, 'createRecord').returns({});
        reloadStub = sinon.stub(windowProxy, 'reload');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('didTransition', function () {
        function callDidTransition() {
            // we schedule reload to be called in afterRender so we need a runloop
            run(() => {
                route.didTransition();
            });
        }

        describe('with model.isNew === true', function () {
            it('does not call reload', function () {
                const model = {isNew: true};
                controller.post = model;
                callDidTransition();
                expect(reloadStub.called).to.be.false;
            });
        });

        describe('with model.isNew === false', function () {
            it('calls reload', async function () {
                const model = {isNew: false};
                controller.post = model;
                callDidTransition();
                expect(reloadStub.calledOnce).to.be.true;
            });

            it('logs to console', async function () {
                // we attempt to re-create the new post for debug logging purposes
                // (recreatedPostIsGood = true when the secondary createRecord call results in a good model state)
                createRecordStub.returns({isNew: true});

                const consoleStub = sinon.stub(console, 'error');
                const model = {isNew: false};
                controller.post = model;
                callDidTransition();

                expect(createRecordStub.calledOnce, 'createRecordStub called').to.be.true;
                expect(consoleStub).to.have.been.calledWith('New post route transitioned with post.isNew=false', {recreatedPostIsGood: true});
            });

            it('logs to Sentry', async function () {
                // we attempt to re-create the new post for debug logging purposes
                // (recreatedPostIsGood = true when the secondary createRecord call results in a good model state)
                createRecordStub.returns({isNew: true});

                const model = {isNew: false};
                controller.post = model;
                callDidTransition();

                // Sentry reports are delivered async so it's best to wait for them to avoid flaky tests
                await waitUntil(() => testkit.reports().length > 0);

                expect(testkit.reports()).to.have.length(1);
                const report = testkit.reports()[0];
                expect(report.message).to.equal('New post route transitioned with post.isNew=false');
                expect(report.tags).to.deep.equal({shown_to_user: false, grammarly: false, savePostTask: true});
                expect(report.extra).to.deep.equal({recreatedPostIsGood: true});
            });
        });
    });
});
