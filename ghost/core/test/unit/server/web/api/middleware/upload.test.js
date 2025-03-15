const should = require('should');
const validation = require('../../../../../../core/server/web/api/middleware/upload')._test;
const imageFixturePath = ('../../../../../utils/fixtures/images/');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

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

    describe('sanitizeSvgContent', function () {
        it('it removes <script> tags from SVGs', async function () {
            const filepath = path.join(__dirname, imageFixturePath, 'svg-with-unsafe-script.svg');
            const original = fs.readFileSync(filepath, 'utf8');

            assert.ok(original.includes('<script'));

            const sanitized = validation.sanitizeSvgContent(original);
            assert.ok(!sanitized.includes('<script'), 'Sanitized SVG should not contain a <script> tag');
        });

        it('it removes <foreignObject> tags from SVGs', async function () {
            const filepath = path.join(__dirname, imageFixturePath, 'svg-with-unsafe-foreign-object.svg');
            const original = fs.readFileSync(filepath, 'utf8');

            assert.ok(original.includes('<foreignObject'));

            const sanitized = validation.sanitizeSvgContent(original);
            assert.ok(!sanitized.includes('<foreignObject'), 'Sanitized SVG should not contain a <foreignObject> tag');
        });

        it('it removes <embed> tags from SVGs', async function () {
            const filepath = path.join(__dirname, imageFixturePath, 'svg-with-unsafe-embed.svg');
            const original = fs.readFileSync(filepath, 'utf8');

            assert.ok(original.includes('<embed'));

            const sanitized = validation.sanitizeSvgContent(original);
            assert.ok(!sanitized.includes('<embed'), 'Sanitized SVG should not contain a <embed> tag');
        });

        it('it removes on* attributes from SVGs', async function () {
            const filepath = path.join(__dirname, imageFixturePath, 'svg-with-unsafe-onclick.svg');
            const original = fs.readFileSync(filepath, 'utf8');

            assert.ok(original.includes('onclick'));

            const sanitized = validation.sanitizeSvgContent(original);
            assert.ok(!sanitized.includes('onclick'), 'Sanitized SVG should not contain an onclick attribute');
        });

        it('it removes href attributes from SVGs', async function () {
            const filepath = path.join(__dirname, imageFixturePath, 'svg-with-unsafe-href.svg');
            const original = fs.readFileSync(filepath, 'utf8');

            assert.ok(original.includes('href'));

            const sanitized = validation.sanitizeSvgContent(original);
            assert.ok(!sanitized.includes('href'), 'Sanitized SVG should not contain an href attribute');
        });

        it('it removes xlink:href attributes from SVGs', async function () {
            const filepath = path.join(__dirname, imageFixturePath, 'svg-with-unsafe-xlink-href.svg');
            const original = fs.readFileSync(filepath, 'utf8');

            assert.ok(original.includes('xlink:href'));

            const sanitized = validation.sanitizeSvgContent(original);
            assert.ok(!sanitized.includes('xlink:href'), 'Sanitized SVG should not contain an xlink:href attribute');
        });

        it('it returns null for malformed SVGs', async function () {
            const filepath = path.join(__dirname, imageFixturePath, 'svg-malformed.svg');
            const original = fs.readFileSync(filepath, 'utf8');

            const sanitized = validation.sanitizeSvgContent(original);
            assert.equal(sanitized, null, 'Malformed SVG should return null after sanitization');
        });

        it('returns true for a safe svg file', async function () {
            const filepath = path.join(__dirname, imageFixturePath, 'ghost-logo.svg');
            const original = fs.readFileSync(filepath, 'utf8');

            assert.ok(!original.includes('<script'));
            assert.ok(!original.includes('onclick'));

            const sanitized = validation.sanitizeSvgContent(original);
            assert.ok(sanitized, 'Safe SVG should return a string after sanitization');
        });
    });
});
