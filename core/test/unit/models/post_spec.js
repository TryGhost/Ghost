'use strict';

const should = require('should'),
    _ = require('lodash'),
    models = require('../../../server/models');

describe('models: post', function () {
    let post;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        post = models.Post.forge();
    });

    describe('static functions', function () {
        describe('processOptions', function () {
            describe('[deprecated] staticPages', function () {
                it('staticPages="all"', function () {
                    let options = {staticPages: 'all'};

                    models.Post.processOptions(_.clone(options)).should.eql({
                        where: {
                            statements: [
                                {
                                    prop: 'page',
                                    op: 'IN',
                                    value: [true, false]
                                }
                            ]
                        }
                    });
                });

                it('staticPages="true"', function () {
                    let options = {staticPages: 'true'};

                    models.Post.processOptions(_.clone(options)).should.eql({
                        where: {
                            statements: [
                                {
                                    prop: 'page',
                                    op: '=',
                                    value: true
                                }
                            ]
                        }
                    });
                });

                it('staticPages=false', function () {
                    let options = {staticPages: false};

                    models.Post.processOptions(_.clone(options)).should.eql(options);
                });

                it('staticPages="1"', function () {
                    let options = {staticPages: '1'};

                    models.Post.processOptions(_.clone(options)).should.eql({
                        where: {
                            statements: [
                                {
                                    prop: 'page',
                                    op: '=',
                                    value: true
                                }
                            ]
                        }
                    });
                });

                it('staticPages=1', function () {
                    let options = {staticPages: 1};

                    models.Post.processOptions(_.clone(options)).should.eql({
                        where: {
                            statements: [
                                {
                                    prop: 'page',
                                    op: '=',
                                    value: true
                                }
                            ]
                        }
                    });
                });

                it('staticPages="0"', function () {
                    let options = {staticPages: '0'};

                    models.Post.processOptions(_.clone(options)).should.eql({
                        where: {
                            statements: [
                                {
                                    prop: 'page',
                                    op: '=',
                                    value: false
                                }
                            ]
                        }
                    });
                });
            });
        });
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
