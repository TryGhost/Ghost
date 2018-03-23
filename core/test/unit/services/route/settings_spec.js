'use strict';

const sinon = require('sinon'),
    should = require('should'),
    rewire = require('rewire'),
    fs = require('fs-extra'),
    yaml = require('js-yaml'),
    path = require('path'),

    settingsRouter = rewire('../../../../server/services/route/settings'),

    sandbox = sinon.sandbox.create();

describe('Routes', function () {
    let goodYamlFile, badYamlFile;

    beforeEach(function () {
        goodYamlFile = fs.readFileSync(path.join(__dirname, '../../../utils/fixtures/routes/goodroutes.yaml'), 'utf8');
        badYamlFile = fs.readFileSync(path.join(__dirname, '../../../utils/fixtures/routes/badroutes.yaml'), 'utf8');
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Settings', function () {
        describe('ensureRoutesFile', function () {
            it('returns yaml file from settings folder if it exists', function () {
                const fsReadFileStub = sandbox.stub(fs, 'readFile').resolves(goodYamlFile);

                return settingsRouter().then((result) => {
                    should.exist(result);
                    result.should.be.an.Object().with.properties('routes', 'collections', 'resources');
                    fsReadFileStub.calledOnce.should.be.true();
                });
            });

            it('copies default routes file if no file found', function () {
                const fsError = new Error('not found');
                fsError.code = 'ENOENT';
                const fsReadFileStub = sandbox.stub(fs, 'readFile');
                const fsCopyStub = sandbox.stub(fs, 'copy').resolves();

                fsReadFileStub.onFirstCall().rejects(fsError);
                // route file in settings directotry is not found
                fsReadFileStub.onSecondCall().resolves(goodYamlFile);

                return settingsRouter().then((result) => {
                    should.exist(result);
                    result.should.be.an.Object().with.properties('routes', 'collections', 'resources');
                    fsReadFileStub.calledTwice.should.be.true();
                });
            });

            it('rejects, if routes file doesn\'t exist and default file can\'t be copied', function () {
                const fsError = new Error('not found');
                fsError.code = 'ENOENT';
                const fsReadFileStub = sandbox.stub(fs, 'readFile');
                const fsCopyStub = sandbox.stub(fs, 'copy').rejects(fsError);

                fsReadFileStub.onFirstCall().rejects(fsError);
                // route file in settings directotry is not found
                fsReadFileStub.onSecondCall().resolves(goodYamlFile);

                return settingsRouter().then((result) => {
                    should.not.exist(result);
                }).catch((error) => {
                    should.exist(error);
                    fsReadFileStub.calledOnce.should.be.true();
                    fsCopyStub.calledOnce.should.be.true();
                });
            });

            it('rejects, if error is not a not found error', function () {
                const fsReadFileStub = sandbox.stub(fs, 'readFile').rejects(new Error('Oopsi!'));

                return settingsRouter().then((result) => {
                    should.not.exist(result);
                }).catch((error) => {
                    should.exist(error);
                    fsReadFileStub.calledOnce.should.be.true();
                });
            });
        });

        describe('loadSettings', function () {
            let ensureRoutesFileStub,
                yamlSpy;

            beforeEach(function () {
                yamlSpy = sandbox.spy(yaml, 'safeLoad');
                ensureRoutesFileStub = sinon.stub();
            });

            it('can parse a valid yaml file and returns a routes object', function () {
                ensureRoutesFileStub.resolves(goodYamlFile);
                settingsRouter.__set__('ensureRoutesFile', ensureRoutesFileStub);

                return settingsRouter().then((routes) => {
                    should.exist(routes);
                    routes.should.be.an.Object().with.properties('routes', 'collections', 'resources');
                    yamlSpy.calledOnce.should.be.true();
                });
            });

            it('can handle parsing error and shows clear error message', function () {
                ensureRoutesFileStub.resolves(badYamlFile);
                settingsRouter.__set__('ensureRoutesFile', ensureRoutesFileStub);

                return settingsRouter().then((routes) => {
                    should.not.exist(routes);
                }).catch((error) => {
                    yamlSpy.calledOnce.should.be.true();
                    should.exist(error);
                    error.message.should.eql('Could not parse `routes.yaml`: bad indentation of a mapping entry.');
                    error.context.should.eql('bad indentation of a mapping entry at line 5, column 10:\n        route: \'{globals.permalinks}\'\n             ^');
                    error.help.should.eql('Check your `routes.yaml` file for typos and fix the named issues.');
                });
            });

            it('can hanlde error from ensureRoutesFile fn', function () {
                ensureRoutesFileStub.rejects(new Error('here we have the salad'));
                settingsRouter.__set__('ensureRoutesFile', ensureRoutesFileStub);

                return settingsRouter().then((routes) => {
                    should.not.exist(routes);
                }).catch((error) => {
                    yamlSpy.calledOnce.should.be.false();
                    should.exist(error);
                    error.message.should.be.eql('here we have the salad');
                });
            });
        });
    });
});
