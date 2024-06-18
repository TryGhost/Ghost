const should = require('should');
const validation = require('../../../../../../core/server/web/api/middleware/upload')._test;
const imageFixturePath = ('../../../../../utils/fixtures/images/');
const fs = require('fs');
const path = require('path');

describe('web utils', function () {
    describe('checkFileExists', function () {
        it('should return true if file exists in input', function () {
            validation.checkFileExists({mimetype: 'file', path: 'path'}).should.be.true;
        });

        it('should return false if file does not exist in input', function () {
            validation.checkFileExists({}).should.be.false;
        });

        it('should return false if file is incorrectly structured', function () {
            validation.checkFileExists({type: 'file'}).should.be.false;
        });
    });

    describe('checkFileIsValid', function () {
        it('returns true if file has valid extension and type', function () {
            validation.checkFileIsValid({
                name: 'test.txt',
                mimetype: 'text',
                ext: '.txt'
            }, ['text'], ['.txt']).should.be.true;

            validation.checkFileIsValid({
                name: 'test.jpg',
                mimetype: 'jpeg',
                ext: '.jpg'
            }, ['text', 'jpeg'], ['.txt', '.jpg']).should.be.true;
        });

        it('returns false if file has invalid extension', function () {
            validation.checkFileIsValid({name: 'test.txt', mimetype: 'text'}, ['text'], ['.tar']).should.be.false;
            validation.checkFileIsValid({name: 'test', mimetype: 'text'}, ['text'], ['.txt']).should.be.false;
        });

        it('returns false if file has invalid type', function () {
            validation.checkFileIsValid({name: 'test.txt', mimetype: 'text'}, ['archive'], ['.txt']).should.be.false;
        });
    });

    describe('isSvgSafe', function () {
        it('detects a <script> tag in a svg file', async function () {
            const filepath = path.join(__dirname, imageFixturePath, 'svg-with-script.svg');
            const dirtySvgContent = fs.readFileSync(filepath, 'utf8');
            dirtySvgContent.should.containEql('<script');
            validation.isSvgSafe(filepath).should.be.false;
        });
        it('detects a on attribute in a svg file', async function () {
            const filepath = path.join(__dirname, imageFixturePath, 'svg-with-script2.svg');
            const dirtySvgContent = fs.readFileSync(filepath, 'utf8');
            dirtySvgContent.should.containEql('onclick');
            validation.isSvgSafe(filepath).should.be.false;
        });
        it('returns true for a safe svg file', async function () {
            const filepath = path.join(__dirname, imageFixturePath, 'ghost-logo.svg');
            const dirtySvgContent = fs.readFileSync(filepath, 'utf8');
            dirtySvgContent.should.not.containEql('<script');
            validation.isSvgSafe(filepath).should.be.true;
        });

        it('returns false for malformed svg', async function () {
            const filepath = path.join(__dirname, imageFixturePath, 'svg-malformed.svg');
            validation.isSvgSafe(filepath).should.be.false;
        });
    });
});
