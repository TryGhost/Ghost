/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';
import Pretender from 'pretender';
import wait from 'ember-test-helpers/wait';

const {run} = Ember;

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
    'gh-file-uploader',
    'Integration: Component: gh-file-uploader',
    {
        integration: true
    },
    function() {
        let server;

        beforeEach(function () {
            server = new Pretender();
        });

        afterEach(function () {
            server.shutdown();
        });

        it('renders', function() {
            this.render(hbs`{{gh-file-uploader}}`);

            expect(this.$('label').text().trim(), 'default label')
                .to.equal('Select or drag-and-drop a file');
        });

        it('renders form with supplied label text', function () {
            this.set('labelText', 'My label');
            this.render(hbs`{{gh-file-uploader labelText=labelText}}`);

            expect(this.$('label').text().trim(), 'label')
                .to.equal('My label');
        });

        it('generates request to supplied endpoint', function (done) {
            stubSuccessfulUpload(server);
            this.set('uploadUrl', '/ghost/api/v0.1/uploads/');

            this.render(hbs`{{gh-file-uploader url=uploadUrl}}`);
            this.$('input[type="file"]').trigger('change');

            wait().then(() => {
                expect(server.handledRequests.length).to.equal(1);
                expect(server.handledRequests[0].url).to.equal('/ghost/api/v0.1/uploads/');
                done();
            });
        });

        it('handles drag over/leave', function () {
            this.render(hbs`{{gh-file-uploader}}`);

            run(() => {
                let dragover = Ember.$.Event('dragover', {
                    dataTransfer: {
                        files: []
                    }
                });
                this.$('.gh-image-uploader').trigger(dragover);
            });

            expect(this.$('.gh-image-uploader').hasClass('--drag-over'), 'has drag-over class').to.be.true;

            run(() => {
                this.$('.gh-image-uploader').trigger('dragleave');
            });

            expect(this.$('.gh-image-uploader').hasClass('--drag-over'), 'has drag-over class').to.be.false;
        });
    }
);
