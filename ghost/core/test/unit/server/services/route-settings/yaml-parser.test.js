const sinon = require('sinon');
const should = require('should');
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
            should.exist(result);
            result.should.be.an.Object().with.properties('routes', 'collections', 'taxonomies');
            yamlSpy.calledOnce.should.be.true();
        });

        it('rejects with clear error when parsing fails', function () {
            const file = fs.readFileSync(path.join(__dirname, '../../../../utils/fixtures/settings/', 'badroutes.yaml'), 'utf8');

            try {
                const result = yamlParser(file);
                should.not.exist(result);
            } catch (error) {
                should.exist(error);
                error.message.should.eql('Could not parse provided YAML file: bad indentation of a mapping entry.');
                error.context.should.containEql('bad indentation of a mapping entry (5:14)');
                error.help.should.eql('Check provided file for typos and fix the named issues.');
                yamlSpy.calledOnce.should.be.true();
            }
        });
    });
});
