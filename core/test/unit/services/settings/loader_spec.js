const sinon = require('sinon'),
    should = require('should'),
    rewire = require('rewire'),
    fs = require('fs-extra'),
    path = require('path'),
    configUtils = require('../../../utils/configUtils'),
    common = require('../../../../server/lib/common'),
    loadSettings = rewire('../../../../frontend/services/settings/loader');

describe('UNIT > Settings Service loader:', function () {
    beforeEach(function () {
        configUtils.set('paths:contentPath', path.join(__dirname, '../../../utils/fixtures/'));
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
    });

    describe('Settings Loader', function () {
        const yamlStubFile = {
            routes: null,
            collections: {
                '/': {
                    permalink: '/{slug}/',
                    template: ['home', 'index']
                }
            },
            taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
        };

        let yamlParserStub;
        let validateStub;
        let settingsCacheStub;
        let routesString;

        beforeEach(function () {
            yamlParserStub = sinon.stub();
            validateStub = sinon.stub();
            settingsCacheStub = sinon.stub();
            settingsCacheStub.get = sinon.stub();

            const routesPath = path.join(__dirname, '../../../utils/fixtures/settings/goodroutes.yaml');
            routesString = fs.readFileSync(routesPath, 'utf8');
            settingsCacheStub.get.withArgs('routes_yaml').returns(routesString);
            
            loadSettings.__set__('settingsCache', settingsCacheStub);
        });

        it('returns a settings object', function () {
            yamlParserStub.returns(yamlStubFile);
            validateStub.returns({routes: {}, collections: {}, taxonomies: {}});

            loadSettings.__set__('yamlParser', yamlParserStub);
            loadSettings.__set__('validate', validateStub);

            const setting = loadSettings('routes');
            should.exist(setting);
            setting.should.be.an.Object().with.properties('routes', 'collections', 'taxonomies');
        });

        it('can handle errors from YAML parser', function (done) {
            yamlParserStub.throws(new common.errors.GhostError({
                message: 'could not parse yaml file',
                context: 'bad indentation of a mapping entry at line 5, column 10'
            }));

            loadSettings.__set__('yamlParser', yamlParserStub);

            try {
                loadSettings('routes');
                done(new Error('Loader should fail'));
            } catch (err) {
                should.exist(err);
                err.message.should.be.eql('could not parse yaml file');
                err.context.should.be.eql('bad indentation of a mapping entry at line 5, column 10');
                yamlParserStub.calledOnce.should.be.true();
                done();
            }
        });

        it('throws error if setting can\'t be parsed', function (done) {
            yamlParserStub = sinon.stub().throws();
            loadSettings.__set__('yamlParser', yamlParserStub);

            try {
                loadSettings('routes');
                done(new Error('Loader should fail'));
            } catch (err) {
                err.message.should.match(/Error trying to load YAML setting for/);
                yamlParserStub.calledWith(routesString, 'routes').should.be.true();
                done();
            }
        });
    });
});
