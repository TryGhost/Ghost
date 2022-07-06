const should = require('should');
const sinon = require('sinon');
const _ = require('lodash');

const validate = require('../../../../../core/server/services/themes/validate');

const gscan = require('gscan');

describe('Themes', function () {
    let checkZipStub;
    let checkStub;
    let formatStub;

    beforeEach(function () {
        checkZipStub = sinon.stub(gscan, 'checkZip');
        checkStub = sinon.stub(gscan, 'check');
        formatStub = sinon.stub(gscan, 'format');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Validate', function () {
        const testTheme = {
            name: 'supertheme',
            version: '1.0.0',
            path: '/path/to/theme'
        };

        it('[success] validates a valid zipped theme', function () {
            checkZipStub.resolves({});
            formatStub.returns({results: {error: []}});

            return validate.check(testTheme, true)
                .then((checkedTheme) => {
                    checkZipStub.calledOnce.should.be.true();
                    checkZipStub.calledWith(testTheme).should.be.true();
                    checkStub.callCount.should.be.equal(0);
                    formatStub.calledOnce.should.be.true();
                    checkedTheme.should.be.an.Object();

                    should.equal(validate.canActivate(checkedTheme), true);
                });
        });

        it('[success] validates a valid unzipped theme', function () {
            checkStub.resolves({});
            formatStub.returns({results: {error: []}});

            return validate.check(testTheme, false)
                .then((checkedTheme) => {
                    checkZipStub.callCount.should.be.equal(0);
                    checkStub.calledOnce.should.be.true();
                    checkStub.calledWith(testTheme.path).should.be.true();
                    formatStub.calledOnce.should.be.true();
                    checkedTheme.should.be.an.Object();

                    should.equal(validate.canActivate(checkedTheme), true);
                });
        });

        it('[failure] validates an invalid zipped theme', function () {
            checkZipStub.resolves({});
            formatStub.returns({
                results: {
                    error: [
                        {
                            fatal: true,
                            level: 'error',
                            rule: 'Replace the <code>{{#if author.cover}}</code> helper with <code>{{#if author.cover_image}}</code>',
                            details: 'The <code>cover</code> attribute was replaced with <code>cover_image</code>.<br>Instead of <code>{{#if author.cover}}</code> you need to use <code>{{#if author.cover_image}}</code>.<br>See the object attributes of <code>author</code> <a href="https://ghost.org/docs/themes/contexts/author/#author-object-attributes" target=_blank>here</a>.',
                            failures: [{}],
                            code: 'GS001-DEPR-CON-AC'
                        }
                    ]
                }
            });

            return validate.check(testTheme, true)
                .then((checkedTheme) => {
                    checkZipStub.calledOnce.should.be.true();
                    checkZipStub.calledWith(testTheme).should.be.true();
                    checkStub.callCount.should.be.equal(0);
                    formatStub.calledOnce.should.be.true();

                    should.equal(validate.canActivate(checkedTheme), false);
                });
        });

        it('[failure] validates an invalid unzipped theme', function () {
            checkStub.resolves({});
            formatStub.returns({
                results: {
                    error: [
                        {
                            fatal: true,
                            level: 'error',
                            rule: 'Replace the <code>{{#if author.cover}}</code> helper with <code>{{#if author.cover_image}}</code>',
                            details: 'The <code>cover</code> attribute was replaced with <code>cover_image</code>.<br>Instead of <code>{{#if author.cover}}</code> you need to use <code>{{#if author.cover_image}}</code>.<br>See the object attributes of <code>author</code> <a href="https://ghost.org/docs/themes/contexts/author/#author-object-attributes" target=_blank>here</a>.',
                            failures: [{}],
                            code: 'GS001-DEPR-CON-AC'
                        }
                    ]
                }
            });

            return validate.check(testTheme, false)
                .then((checkedTheme) => {
                    checkStub.calledOnce.should.be.true();
                    checkStub.calledWith(testTheme.path).should.be.true();
                    checkZipStub.callCount.should.be.equal(0);
                    formatStub.calledOnce.should.be.true();

                    should.equal(validate.canActivate(checkedTheme), false);
                });
        });

        it('[failure] can handle a corrupt zip file', function () {
            checkZipStub.rejects(new Error('invalid zip file'));
            formatStub.returns({results: {error: []}});

            return validate.check(testTheme, true)
                .then((checkedTheme) => {
                    checkedTheme.should.not.exist();
                }).catch((error) => {
                    error.should.be.an.Object();
                    error.message.should.be.equal('invalid zip file');
                    checkZipStub.calledOnce.should.be.true();
                    checkZipStub.calledWith(testTheme).should.be.true();
                    checkStub.callCount.should.be.equal(0);
                    formatStub.calledOnce.should.be.false();
                });
        });
    });
});
