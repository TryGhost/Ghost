const should = require('should');
const sinon = require('sinon');
const fs = require('fs-extra');
const tmp = require('tmp');
const join = require('path').join;
const config = require('../../../../../core/shared/config');
const loader = require('../../../../../core/server/services/themes/loader');
const themeList = require('../../../../../core/server/services/themes/list');

describe('Themes', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('Loader', function () {
        let themePath;

        beforeEach(function () {
            themePath = tmp.dirSync({unsafeCleanup: true});
            sinon.stub(config, 'getContentPath').withArgs('themes').returns(themePath.name);
        });

        afterEach(function () {
            themePath.removeCallback();
        });

        describe('Load All', function () {
            it('should load directory and include only folders', function (done) {
                // create trash
                fs.writeFileSync(join(themePath.name, 'casper.zip'), '');
                fs.writeFileSync(join(themePath.name, '.DS_Store'), '');

                // create actual theme
                fs.mkdirSync(join(themePath.name, 'casper'));
                fs.mkdirSync(join(themePath.name, 'casper', 'partials'));
                fs.writeFileSync(join(themePath.name, 'casper', 'index.hbs'), '');
                fs.writeFileSync(join(themePath.name, 'casper', 'partials', 'navigation.hbs'), '');

                loader.loadAllThemes()
                    .then(function (result) {
                        const themeResult = themeList.getAll();

                        // Loader doesn't return anything
                        should.not.exist(result);

                        themeResult.should.eql({
                            casper: {
                                name: 'casper',
                                path: join(themePath.name, 'casper'),
                                'package.json': null
                            }
                        });

                        done();
                    })
                    .catch(done);
            });

            it('should read directory and read package.json if present', function (done) {
                // create trash
                fs.writeFileSync(join(themePath.name, 'README.md'), '');
                fs.writeFileSync(join(themePath.name, 'Thumbs.db'), '');

                // create actual theme
                fs.mkdirSync(join(themePath.name, 'casper'));
                fs.mkdirSync(join(themePath.name, 'not-casper'));
                fs.writeFileSync(
                    join(themePath.name, 'casper', 'package.json'),
                    JSON.stringify({name: 'casper', version: '0.1.2'})
                );

                loader.loadAllThemes()
                    .then(function (result) {
                        const themeResult = themeList.getAll();

                        // Loader doesn't return anything
                        should.not.exist(result);

                        themeResult.should.eql({
                            casper: {
                                name: 'casper',
                                path: join(themePath.name, 'casper'),
                                'package.json': {name: 'casper', version: '0.1.2'}
                            },
                            'not-casper': {
                                name: 'not-casper',
                                path: join(themePath.name, 'not-casper'),
                                'package.json': null
                            }
                        });

                        done();
                    })
                    .catch(done);
            });
        });

        describe('Load One', function () {
            it('should read directory and include only single requested theme', function (done) {
                // create trash
                fs.writeFileSync(join(themePath.name, 'casper.zip'), '');
                fs.writeFileSync(join(themePath.name, '.DS_Store'), '');

                // create actual theme
                fs.mkdirSync(join(themePath.name, 'casper'));
                fs.writeFileSync(join(themePath.name, 'casper', 'index.hbs'), '');
                fs.writeFileSync(
                    join(themePath.name, 'casper', 'package.json'),
                    JSON.stringify({name: 'casper', version: '0.1.2'})
                );
                fs.mkdirSync(join(themePath.name, 'not-casper'));
                fs.writeFileSync(join(themePath.name, 'not-casper', 'index.hbs'), '');

                loader.loadOneTheme('casper')
                    .then(function (themeResult) {
                        themeResult.should.eql({
                            name: 'casper',
                            path: join(themePath.name, 'casper'),
                            'package.json': {name: 'casper', version: '0.1.2'}
                        });

                        done();
                    })
                    .catch(done);
            });

            it('should throw an error if theme cannot be found', function (done) {
                // create trash
                fs.writeFileSync(join(themePath.name, 'casper.zip'), '');
                fs.writeFileSync(join(themePath.name, '.DS_Store'), '');

                loader.loadOneTheme('casper')
                    .then(function () {
                        done('Should have thrown an error');
                    })
                    .catch(function (err) {
                        err.message.should.eql('Package not found');
                        done();
                    });
            });
        });
    });
});
