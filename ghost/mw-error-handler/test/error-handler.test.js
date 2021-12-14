// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const {InternalServerError} = require('@tryghost/errors');
const {prepareError, handleJSONResponse, handleJSONResponseV2, handleHTMLResponse} = require('../lib/mw-error-handler');

describe('Prepare Error', function () {
    it('Correctly prepares a normal error', function (done) {
        prepareError(new Error('test!'), {}, {
            set: () => {}
        }, (err) => {
            err.statusCode.should.eql(500);
            err.name.should.eql('InternalServerError');
            err.stack.should.startWith('Error: test!');
            done();
        });
    });
});

describe('Error renderers', function () {
    it('Renders JSON', function (done) {
        const errorRenderer = handleJSONResponse({
            errorHandler: () => {}
        })[2];

        errorRenderer(new Error('test!'), {}, {
            json: (data) => {
                data.errors.length.should.eql(1);
                data.errors[0].message.should.eql('test!');
                done();
            }
        }, () => {});
    });

    it('Renders JSON for v2', function (done) {
        const errorRenderer = handleJSONResponseV2({
            errorHandler: () => {}
        })[2];

        errorRenderer(new Error('test!'), {}, {
            json: (data) => {
                data.errors.length.should.eql(1);
                data.errors[0].message.should.eql('test!');
                done();
            }
        }, () => {});
    });

    it('Uses templates when required', function (done) {
        const errorRenderer = handleJSONResponseV2({
            errorHandler: () => {}
        })[2];

        errorRenderer(new InternalServerError({
            message: 'test!'
        }), {
            frameOptions: {
                docName: 'blog',
                method: 'browse'
            }
        }, {
            json: (data) => {
                data.errors.length.should.eql(1);
                data.errors[0].message.should.eql('Internal server error, cannot list blog.');
                done();
            }
        }, () => {});
    });

    it('Exports the HTML renderer', function () {
        const renderer = handleHTMLResponse({
            errorHandler: () => {}
        });

        renderer.length.should.eql(2);
    });
});
