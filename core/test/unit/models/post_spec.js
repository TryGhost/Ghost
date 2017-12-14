'use strict';

const should = require('should'),
    models = require('../../../server/models');

describe('models: post', function () {
    let post;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        post = models.Post.forge();
    });

    describe('formatsToJSON', function () {
        it('no formats option', function () {
            const attrs = {html: 'html', mobiledoc: 'mobiledoc'}, options = {};
            post.formatsToJSON(attrs, options).should.have.properties(['html']);
        });

        it('empty formats option', function () {
            const attrs = {html: 'html', mobiledoc: 'mobiledoc'}, options = {formats: ''};
            post.formatsToJSON(attrs, options).should.have.properties(['html']);
        });

        it('spelling mistake', function () {
            const attrs = {html: 'html', mobiledoc: 'mobiledoc', plaintext: 'plain'},
                options = {formats: ['plaintext', 'mobiledo']};

            post.formatsToJSON(attrs, options).should.have.properties(['plaintext']);
        });

        it('multiple formats', function () {
            const attrs = {html: 'html', mobiledoc: 'mobiledoc', plaintext: 'plain', amp: 'amp'},
                options = {formats: ['plaintext', 'mobiledoc', 'amp']};

            post.formatsToJSON(attrs, options).should.have.properties(['mobiledoc', 'plaintext', 'amp']);
        });

        it('unallowed format', function () {
            const attrs = {html: 'html', mobiledoc: 'mobiledoc', plaintext: 'plain', amp: 'amp'},
                options = {formats: ['amp', 'unallowed']};

            post.formatsToJSON(attrs, options).should.have.properties(['amp']);
        });

        it('unallowed format', function () {
            const attrs = {html: 'html', mobiledoc: 'mobiledoc', plaintext: 'plain', amp: 'amp'},
                options = {formats: ['unallowed']};

            post.formatsToJSON(attrs, options).should.have.properties(['html']);
        });
    });
});
