const assert = require('node:assert/strict');
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
            it('should load directory and include only folders', async function () {
                // create trash
                fs.writeFileSync(join(themePath.name, 'casper.zip'), '');
                fs.writeFileSync(join(themePath.name, '.DS_Store'), '');

                // create actual theme
                fs.mkdirSync(join(themePath.name, 'casper'));
                fs.mkdirSync(join(themePath.name, 'casper', 'partials'));
                fs.writeFileSync(join(themePath.name, 'casper', 'index.hbs'), '');
                fs.writeFileSync(join(themePath.name, 'casper', 'partials', 'navigation.hbs'), '');

                const result = await loader.loadAllThemes();
                const themeResult = themeList.getAll();

                // Loader doesn't return anything
                assert.equal(result, undefined);

                assert.deepEqual(themeResult, {
                    casper: {
                        name: 'casper',
                        path: join(themePath.name, 'casper'),
                        'package.json': null
                    }
                });
            });

            it('should read directory and read package.json if present', async function () {
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

                const result = await loader.loadAllThemes();
                const themeResult = themeList.getAll();

                // Loader doesn't return anything
                assert.equal(result, undefined);

                assert.deepEqual(themeResult, {
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
            });
        });

        describe('Load One', function () {
            it('should read directory and include only single requested theme', async function () {
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

                const themeResult = await loader.loadOneTheme('casper');

                assert.deepEqual(themeResult, {
                    name: 'casper',
                    path: join(themePath.name, 'casper'),
                    'package.json': {name: 'casper', version: '0.1.2'}
                });
            });

            it('should throw an error if theme cannot be found', async function () {
                // create trash
                fs.writeFileSync(join(themePath.name, 'casper.zip'), '');
                fs.writeFileSync(join(themePath.name, '.DS_Store'), '');

                await assert.rejects(
                    loader.loadOneTheme('casper'),
                    (err) => {
                        assert.equal(err.message, 'Package not found');
                        return true;
                    }
                );
            });
        });
    });
});
