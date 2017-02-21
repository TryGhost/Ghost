var should          = require('should'),
    fs              = require('fs'),
    tmp             = require('tmp'),
    join            = require('path').join,
    readThemes      = require('../../server/themes/read');

// To stop jshint complaining
should.equal(true, true);

describe('Themes', function () {
    describe('Read', function () {
        it('should read directory and include only folders', function (done) {
            var themesPath = tmp.dirSync({unsafeCleanup: true});

            // create trash
            fs.writeFileSync(join(themesPath.name, 'casper.zip'));
            fs.writeFileSync(join(themesPath.name, '.DS_Store'));

            // create actual theme
            fs.mkdirSync(join(themesPath.name, 'casper'));
            fs.mkdirSync(join(themesPath.name, 'casper', 'partials'));
            fs.writeFileSync(join(themesPath.name, 'casper', 'index.hbs'));
            fs.writeFileSync(join(themesPath.name, 'casper', 'partials', 'navigation.hbs'));

            readThemes.all(themesPath.name)
                .then(function (tree) {
                    tree.should.eql({
                        casper: {
                            partials: {
                                'navigation.hbs': join(themesPath.name, 'casper', 'partials', 'navigation.hbs')
                            },
                            'index.hbs': join(themesPath.name, 'casper', 'index.hbs')
                        }
                    });

                    done();
                })
                .catch(done)
                .finally(themesPath.removeCallback);
        });
    });
});
