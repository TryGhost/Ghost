/* jshint expr:true */
import Ember from 'ember';
import sinon from 'sinon';
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Pretender from 'pretender';
import wait from 'ember-test-helpers/wait';

const {run} = Ember;

const keyCodes = {
    enter: 13
};

const configStub = Ember.Service.extend({
    fileStorage: true
});

const sessionStub = Ember.Service.extend({
    isAuthenticated: false,
    authorize(authorizer, block) {
        if (this.get('isAuthenticated')) {
            block('Authorization', 'Bearer token');
        }
    }
});

const stubSuccessfulUpload = function (server, delay = 0) {
    server.post('/ghost/api/v0.1/uploads/', function () {
        return [200, {'Content-Type': 'application/json'}, '"/content/images/test.png"'];
    }, delay);
};

const stubFailedUpload = function (server, code, error, delay = 0) {
    server.post('/ghost/api/v0.1/uploads/', function () {
        return [code, {'Content-Type': 'application/json'}, JSON.stringify({
            errors: [{
                errorType: error,
                message: `Error: ${error}`
            }]
        })];
    }, delay);
};

describeComponent(
    'gh-image-upload',
    'Integration: Component: gh-image-uploader',
    {
        integration: true
    },
    function() {
        let server;

        beforeEach(function () {
            this.register('service:config', configStub);
            this.register('service:session', sessionStub);
            this.inject.service('config', {as: 'configService'});
            this.inject.service('session', {as: 'sessionService'});
            this.set('update', function () {});
            server = new Pretender();
        });

        afterEach(function () {
            server.shutdown();
        });

        it('renders', function() {
            this.set('image', 'http://example.com/test.png');
            this.render(hbs`{{gh-image-uploader image=image}}`);
            expect(this.$()).to.have.length(1);
        });

        it('defaults to upload form', function () {
            this.render(hbs`{{gh-image-uploader image=image}}`);
            expect(this.$('input[type="file"]').length).to.equal(1);
        });

        it('defaults to url form with no filestorage config', function () {
            this.set('configService.fileStorage', false);
            this.render(hbs`{{gh-image-uploader image=image}}`);
            expect(this.$('input[type="file"]').length).to.equal(0);
            expect(this.$('input[type="text"].url').length).to.equal(1);
        });

        it('can switch between form types', function () {
            this.render(hbs`{{gh-image-uploader image=image}}`);
            expect(this.$('input[type="file"]').length).to.equal(1);
            expect(this.$('input[type="text"].url').length).to.equal(0);

            this.$('a.image-url').click();

            expect(this.$('input[type="file"]').length, 'upload form is visible after switch to url form')
                .to.equal(0);
            expect(this.$('input[type="text"].url').length, 'url form is visible after switch to url form')
                .to.equal(1);

            this.$('a.image-upload').click();

            expect(this.$('input[type="file"]').length, 'upload form is visible after switch to upload form')
                .to.equal(1);
            expect(this.$('input[type="text"].url').length, 'url form is visible after switch to upload form')
                .to.equal(0);
        });

        it('triggers formChanged action when switching between forms', function () {
            let formChanged = sinon.spy();
            this.set('formChanged', formChanged);

            this.render(hbs`{{gh-image-uploader image=image formChanged=(action formChanged)}}`);

            this.$('a.image-url').click();
            this.$('a.image-upload').click();

            expect(formChanged.calledTwice).to.be.true;
            expect(formChanged.firstCall.args[0]).to.equal('url-input');
            expect(formChanged.secondCall.args[0]).to.equal('upload');
        });

        describe('file uploads', function () {
            it('renders form with supplied text', function () {
                this.render(hbs`{{gh-image-uploader image=image text="text test"}}`);
                expect(this.$('.description').text().trim()).to.equal('text test');
            });

            it('generates request to correct endpoint', function (done) {
                stubSuccessfulUpload(server);

                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
                this.$('input[type="file"]').trigger('change');

                wait().then(() => {
                    expect(server.handledRequests.length).to.equal(1);
                    expect(server.handledRequests[0].url).to.equal('/ghost/api/v0.1/uploads/');
                    expect(server.handledRequests[0].requestHeaders.Authorization).to.be.undefined;
                    done();
                });
            });

            it('adds authentication headers to request', function (done) {
                stubSuccessfulUpload(server);

                this.get('sessionService').set('isAuthenticated', true);

                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
                this.$('input[type="file"]').trigger('change');

                wait().then(() => {
                    let [request] = server.handledRequests;
                    expect(request.requestHeaders.Authorization).to.equal('Bearer token');
                    done();
                });
            });

            it('handles drag over/leave', function () {
                stubSuccessfulUpload(server);

                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);

                run(() => {
                    this.$('.gh-image-uploader').trigger('dragover');
                });

                expect(this.$('.gh-image-uploader').hasClass('--drag-over'), 'has drag-over class').to.be.true;

                run(() => {
                    this.$('.gh-image-uploader').trigger('dragleave');
                });

                expect(this.$('.gh-image-uploader').hasClass('--drag-over'), 'has drag-over class').to.be.false;
            });
        });

        describe('URL input', function () {
            beforeEach(function () {
                this.set('configService.fileStorage', false);
            });

            it('displays save button by default', function () {
                this.set('image', 'http://example.com/test.png');
                this.render(hbs`{{gh-image-uploader image=image text="text test"}}`);
                expect(this.$('button').length).to.equal(1);
                expect(this.$('input[type="text"]').val()).to.equal('http://example.com/test.png');
            });

            it('can render without a save button', function () {
                this.render(hbs`{{gh-image-uploader image=image saveButton=false text="text test"}}`);
                expect(this.$('button').length).to.equal(0);
                expect(this.$('.description').text().trim()).to.equal('text test');
            });

            it('fires update action when save button clicked', function () {
                let update = sinon.spy();
                this.set('update', update);

                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);

                this.$('input[type="text"]').val('saved url');
                this.$('input[type="text"]').change();
                this.$('button.btn-blue').click();

                expect(update.calledOnce).to.be.true;
                expect(update.firstCall.args[0]).to.equal('saved url');
            });

            it('fires onInput action when typing URL', function () {
                let onInput = sinon.spy();
                this.set('onInput', onInput);

                this.render(hbs`{{gh-image-uploader image=image onInput=(action onInput)}}`);

                this.$('input[type="text"]').val('input url');
                this.$('input[type="text"]').change();

                expect(onInput.calledOnce).to.be.true;
                expect(onInput.firstCall.args[0]).to.equal('input url');
            });

            it('saves on enter key', function () {
                let update = sinon.spy();
                this.set('update', update);

                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);

                this.$('input[type="text"]').val('saved url');
                this.$('input[type="text"]').change();
                this.$('input[type="text"]').trigger(
                    $.Event('keyup', {keyCode: keyCodes.enter, which: keyCodes.enter})
                );

                expect(update.calledOnce).to.be.true;
                expect(update.firstCall.args[0]).to.equal('saved url');
            });
        });
    }
);
