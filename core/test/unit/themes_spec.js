var should          = require('should'),
    fs              = require('fs'),
    tmp             = require('tmp'),
    join            = require('path').join,
    readThemes      = require('../../server/themes/read');

// To stop jshint complaining
should.equal(true, true);

describe('Themes', function () {
    describe('Read All', function () {
        it('should read directory and include only folders', function (done) {
            var themePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(themePath.name, 'casper.zip'));
            fs.writeFileSync(join(themePath.name, '.DS_Store'));

            // create actual theme
            fs.mkdirSync(join(themePath.name, 'casper'));
            fs.mkdirSync(join(themePath.name, 'casper', 'partials'));
            fs.writeFileSync(join(themePath.name, 'casper', 'index.hbs'));
            fs.writeFileSync(join(themePath.name, 'casper', 'partials', 'navigation.hbs'));

            readThemes.all(themePath.name)
                .then(function (themeList) {
                    themeList.should.eql({
                        casper: {
                            name: 'casper',
                            path: join(themePath.name, 'casper'),
                            'package.json': null
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(themePath.removeCallback);
        });

        it('should read directory and read package.json if present', function (done) {
            var themePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(themePath.name, 'README.md'));
            fs.writeFileSync(join(themePath.name, 'Thumbs.db'));

            // create actual theme
            fs.mkdirSync(join(themePath.name, 'casper'));
            fs.mkdirSync(join(themePath.name, 'not-casper'));
            fs.writeFileSync(
                join(themePath.name, 'casper', 'package.json'),
                JSON.stringify({name: 'casper', version: '0.1.2'})
            );

            readThemes.all(themePath.name)
                .then(function (themeList) {
                    themeList.should.eql({
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
                .catch(done)
                .finally(themePath.removeCallback);
        });
    });

    describe('Read One', function () {
        it('should read directory and include only single requested theme', function (done) {
            var themePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(themePath.name, 'casper.zip'));
            fs.writeFileSync(join(themePath.name, '.DS_Store'));

            // create actual theme
            fs.mkdirSync(join(themePath.name, 'casper'));
            fs.writeFileSync(join(themePath.name, 'casper', 'index.hbs'));
            fs.writeFileSync(
                join(themePath.name, 'casper', 'package.json'),
                JSON.stringify({name: 'casper', version: '0.1.2'})
            );
            fs.mkdirSync(join(themePath.name, 'not-casper'));
            fs.writeFileSync(join(themePath.name, 'not-casper', 'index.hbs'));

            readThemes.one(themePath.name, 'casper')
                .then(function (themeList) {
                    themeList.should.eql({
                        casper: {
                            name: 'casper',
                            path: join(themePath.name, 'casper'),
                            'package.json': {name: 'casper', version: '0.1.2'}
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(themePath.removeCallback);
        });

        it('should return empty object if theme cannot be found', function (done) {
            var themePath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(themePath.name, 'casper.zip'));
            fs.writeFileSync(join(themePath.name, '.DS_Store'));

            readThemes.one(themePath.name, 'casper')
                .then(function (themeList) {
                    themeList.should.eql({});

                    done();
                })
                .catch(done)
                .finally(themePath.removeCallback);
        });
    });
});
