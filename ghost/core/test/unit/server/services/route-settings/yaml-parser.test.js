const sinon = require('sinon');
const assert = require('node:assert/strict');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const path = require('path');
const yamlParser = require('../../../../../core/server/services/route-settings/yaml-parser');

describe('UNIT > Settings Service yaml parser:', function () {
    let yamlSpy;

    beforeEach(function () {
        yamlSpy = sinon.spy(yaml, 'load');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Yaml Parser', function () {
        it('parses correct yaml file', function () {
            const file = fs.readFileSync(path.join(__dirname, '../../../../utils/fixtures/settings/', 'goodroutes.yaml'), 'utf8');

            const result = yamlParser(file);
            assert.deepEqual(
                new Set(Object.keys(result)),
                new Set(['routes', 'collections', 'taxonomies'])
            );
            sinon.assert.calledOnce(yamlSpy);
        });

        it('rejects with clear error when parsing fails', function () {
            const file = fs.readFileSync(path.join(__dirname, '../../../../utils/fixtures/settings/', 'badroutes.yaml'), 'utf8');

            try {
                yamlParser(file);
                assert.fail();
            } catch (error) {
                assert(error);
                assert.equal(error.message, 'Could not parse provided YAML file: bad indentation of a mapping entry.');
                assert(error.context.includes('bad indentation of a mapping entry (5:14)'));
                assert.equal(error.help, 'Check provided file for typos and fix the named issues.');
                sinon.assert.calledOnce(yamlSpy);
            }
        });
    });
});