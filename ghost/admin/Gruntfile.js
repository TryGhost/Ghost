/* global -moment */
/* jshint node: true */
/* jscs:disable */
var _              = require('lodash'),
    fs             = require('fs-extra'),
    path           = require('path'),
    https          = require('https'),
    getTopContribs = require('top-gh-contribs'),
    moment         = require('moment'),
    chalk          = require('chalk'),
    Promise        = require('bluebird');

module.exports = function(grunt) {

    // Find all of the task which start with `grunt-` and load them, rather than explicitly declaring them all
    require('matchdep').filterDev(['grunt-*', '!grunt-cli']).forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        clean: {
            built: {
                src: [
                    'dist/**',
                    'public/assets/img/contributors/**',
                    'app/templates/-contributors.hbs'
                ]
            },
            dependencies: {
                src: [
                    'bower_components/**',
                    'node_modules/**'
                ]
            },
            tmp: {
                src: ['tmp/**']
            }
        },

        jshint: {
            options: {
                jshintrc: true,
                ignores: [
                    'node_modules/**',
                    'bower_components/**',
                    'tmp/**',
                    'dist/**',
                    'vendor/**'
                ]
            },

            all: ['**/*.js']
        },

        jscs: {
            app: {
                options: {
                    config: '.jscsrc',
                    excludeFiles: [
                        'node_modules/**',
                        'bower_components/**',
                        'tests/**',
                        'tmp/**',
                        'dist/**',
                        'vendor/**'
                    ]
                },

                files: {
                    src: ['**/*.js']
                }
            },

            tests: {
                options: {
                    config: 'tests/.jscsrc'
                },

                files: {
                    src: [
                        'tests/**/*.js'
                    ]
                }
            }
        },

        // ### grunt-bg-shell
        // Used to run ember-cli watch in the background
        bgShell: {
            ember: {
                cmd: 'npm run build -- --watch',
                bg: true
            }
        },

        watch: {
            csscomb: {
                files: ['app/styles/**/*.css'],
                tasks: ['shell:csscombfix']
            }
        },

        shell: {
            'npm-install': {
                command: 'npm install'
            },

            'bower-install': {
                command: 'bower install'
            },

            ember: {
                command: function (mode) {
                    switch (mode) {
                        case 'prod':
                            return 'npm run build -- --environment=production --silent';

                        case 'dev':
                            return 'npm run build';
                    }
                },
                options: {
                    execOptions: {
                        stdout: false
                    }
                }
            },

            csscombfix: {
                command: 'csscomb -c app/styles/csscomb.json -v app/styles'
            },

            csscomblint: {
                command: 'csscomb -c app/styles/csscomb.json -lv app/styles'
            },

            test: {
                command: 'npm test'
            },

            options: {
                preferLocal: true
            }
        }
    });

    grunt.registerTask('init', 'Install the client dependencies',
        ['shell:npm-install', 'shell:bower-install', 'buildAboutPage']
    );

    grunt.registerTask('lint', 'Run the code style checks and linter',
        ['jshint', 'jscs', 'shell:csscomblint']
    );

    // ### Build About Page *(Utility Task)*
    // Builds the github contributors partial template used on the about page,
    // and downloads the avatar for each of the users.
    // Run by any task that compiles ember assets or manually via `grunt buildAboutPage`.
    // Only builds if the template does not exist.
    // To force a build regardless, supply the --force option.
    //      `grunt buildAboutPage --force`
    grunt.registerTask('buildAboutPage', 'Compile assets for the About Ghost page', function () {
        var done = this.async(),
            templatePath = 'app/templates/-contributors.hbs',
            imagePath = 'public/assets/img/contributors',
            timeSpan = moment().subtract(90, 'days').format('YYYY-MM-DD'),
            oauthKey = process.env.GITHUB_OAUTH_KEY,
            contribNumber = 18;

        if (fs.existsSync(templatePath) && !grunt.option('force')) {
            grunt.log.writeln('Contributors template already exists.');
            grunt.log.writeln(chalk.bold('Skipped'));
            return done();
        }

        grunt.verbose.writeln('Downloading release and contributor information from Github');

        function mergeContribs(first, second) {
            _.each(second, function (contributor) {
                var contributorInFirst = _.find(first, ['name', contributor.name]);

                if (contributorInFirst) {
                    contributorInFirst.commitCount += contributor.commitCount;
                } else {
                    first.push(contributor);
                }
            });

            return _(first)
                .filter(function (contributor) {
                    // remove greenkeeper from contributor list
                    return contributor.name !== 'greenkeeperio-bot';
                })
                .sortBy('commitCount')
                .reverse()
                .take(contribNumber)
                .value();
        }

        return Promise.join(
            Promise.promisify(fs.mkdirs)(imagePath),
            getTopContribs({
                user: 'tryghost',
                repo: 'ghost',
                oauthKey: oauthKey,
                sinceDate: timeSpan,
                count: contribNumber,
                retry: true
            }),
            getTopContribs({
                user: 'tryghost',
                repo: 'ghost-admin',
                oauthKey: oauthKey,
                sinceDate: timeSpan,
                count: contribNumber,
                retry: true
            })
        ).then(function (results) {
            var contributors = mergeContribs(results[1], results[2]),
                contributorTemplate = '<article>\n    <a href="<%= githubUrl %>" title="<%= name %>">\n' +
                    '        <img src="{{gh-path "admin" "/img/contributors"}}/<%= name %>" alt="<%= name %>" />\n' +
                    '    </a>\n</article>',

                downloadImagePromise = function (url, name) {
                    return new Promise(function (resolve, reject) {
                        var file = fs.createWriteStream(path.join(__dirname, imagePath, name));

                        https.get(url, function (response) {
                            response.pipe(file);
                            file.on('finish', function () {
                                file.close();
                                resolve();
                            });
                        }).on('error', reject);
                    });
                };

            grunt.verbose.writeln('Creating contributors template');
            grunt.file.write(
                templatePath,
                _.map(contributors, function (contributor) {
                    var compiled = _.template(contributorTemplate);

                    return compiled(contributor);
                }).join('\n')
            );

            grunt.verbose.writeln('Downloading images for top contributors');
            return Promise.all(_.map(contributors, function (contributor) {
                return downloadImagePromise(contributor.avatarUrl + '&s=60', contributor.name);
            }));
        }).then(done).catch(function (error) {
            grunt.log.error(error);

            if (error.http_status) {
                grunt.log.writeln('GitHub API request returned status: ' + error.http_status);
            }

            if (error.ratelimit_limit) {
                grunt.log.writeln('Rate limit data: limit: %d, remaining: %d, reset: %s', error.ratelimit_limit, error.ratelimit_remaining, moment.unix(error.ratelimit_reset).fromNow());
            }

            done(false);
        });
    });
};
