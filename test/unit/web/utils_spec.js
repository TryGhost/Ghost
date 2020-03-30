var should = require('should'),
    webUtils = require('../../../core/server/web/shared/utils');

describe('web utils', function () {
    describe('checkFileExists', function () {
        it('should return true if file exists in input', function () {
            webUtils.checkFileExists({mimetype: 'file', path: 'path'}).should.be.true();
        });

        it('should return false if file does not exist in input', function () {
            webUtils.checkFileExists({}).should.be.false();
        });

        it('should return false if file is incorrectly structured', function () {
            webUtils.checkFileExists({type: 'file'}).should.be.false();
        });
    });

    describe('checkFileIsValid', function () {
        it('returns true if file has valid extension and type', function () {
            webUtils.checkFileIsValid({
                name: 'test.txt',
                mimetype: 'text',
                ext: '.txt'
            }, ['text'], ['.txt']).should.be.true();

            webUtils.checkFileIsValid({
                name: 'test.jpg',
                mimetype: 'jpeg',
                ext: '.jpg'
            }, ['text', 'jpeg'], ['.txt', '.jpg']).should.be.true();
        });

        it('returns false if file has invalid extension', function () {
            webUtils.checkFileIsValid({name: 'test.txt', mimetype: 'text'}, ['text'], ['.tar']).should.be.false();
            webUtils.checkFileIsValid({name: 'test', mimetype: 'text'}, ['text'], ['.txt']).should.be.false();
        });

        it('returns false if file has invalid type', function () {
            webUtils.checkFileIsValid({name: 'test.txt', mimetype: 'text'}, ['archive'], ['.txt']).should.be.false();
        });
    });
});
