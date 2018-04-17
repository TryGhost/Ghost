'use strict';

const sinon = require('sinon'),
    should = require('should'),
    fs = require('fs-extra'),
    yaml = require('js-yaml'),
    path = require('path'),

    yamlParser = require('../../../../server/services/settings/yaml-parser'),

    sandbox = sinon.sandbox.create();

describe('UNIT > Settings Service:', function () {
    let yamlSpy;

    beforeEach(function () {
        yamlSpy = sandbox.spy(yaml, 'safeLoad');
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Yaml Parser', function () {
        it('parses correct yaml file', function () {
            const file = fs.readFileSync(path.join(__dirname, '../../../utils/fixtures/settings/', 'goodroutes.yaml'), 'utf8');

            const result = yamlParser(file, 'goodroutes.yaml');
            should.exist(result);
            result.should.be.an.Object().with.properties('routes', 'collections', 'resources');
            yamlSpy.calledOnce.should.be.true();
        });

        it('rejects with clear error when parsing fails', function () {
            const file = fs.readFileSync(path.join(__dirname, '../../../utils/fixtures/settings/', 'badroutes.yaml'), 'utf8');

            try {
                const result = yamlParser(file, 'badroutes.yaml');
                should.not.exist(result);
            } catch (error) {
                should.exist(error);
                error.message.should.eql('Could not parse badroutes.yaml: bad indentation of a mapping entry.');
                error.context.should.eql('bad indentation of a mapping entry at line 5, column 10:\n        route: \'{globals.permalinks}\'\n             ^');
                error.help.should.eql('Check your badroutes.yaml file for typos and fix the named issues.');
                yamlSpy.calledOnce.should.be.true();
            }
        });
    });
});
