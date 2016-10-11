var gulp                = require('gulp-help')(require('gulp'), {hideEmpty: true, hideDepsMessage:true}),
    livereload          = require('gulp-livereload'),
    nodemon             = require('gulp-nodemon'),
    gutil               = require('gulp-util'),
    jscs                = require('gulp-jscs'),
    jshint              = require('gulp-jshint'),
    jsonlint            = require('gulp-jsonlint'),
    chalk               = require('chalk'),
    runSequence         = require('run-sequence').use(gulp),
    argv                = require('minimist')(process.argv.slice(2)),
    _                   = require('lodash'),
    exec                = require('child_process').exec,
    spawn               = require('child_process').spawn,
    submodule           = require('gulp-git-submodule'),
    fs                  = require('fs'),
    paramConfig,
    gitBranches,
    swallowError,
    nodemonServerInit,
    filterParams,
    getGitCommand,
    checkDirectoryExistance,
    ember;

// paramConfig is used to store constant values to check against
// called parameter as well as the paths for each repository
paramConfig = {
    ghost: {
        type: 'string',
        regex: /pr\/\d+/i,
        path: 'core/server'
    },
    g: {
        type: 'string',
        regex: /pr\/\d+/i,
        path: 'core/server'
    },
    admin: {
        type: 'string',
        regex: /pr\/\d+/i,
        path: 'core/client'
    },
    a: {
        type: 'string',
        regex: /pr\/\d+/i,
        path: 'core/client'
    },
    casper: {
        type: 'string',
        regex: /pr\/\d+/i,
        path: 'content/themes/casper'
    },
    c: {
        type: 'string',
        regex: /pr\/\d+/i,
        path: 'content/themes/casper'
    },
    force: {
        type: 'boolean'
    },
    f: {
        type: 'boolean'
    }
};

// gitBranches is used to store the currently chosen branch to checkout as well
// as the necessary shell command for `gulp setup`
gitBranches = {
    ghost: {},
    admin: {},
    casper: {}
};

submodule.registerTasks(gulp);

ember = null;

swallowError = function swallowError(error, log) {
    if (log) {gutil.log(chalk.red(error.toString()));}
    gutil.beep();
};

nodemonServerInit = function () {
    livereload.listen();

    return nodemon({
        script: 'index.js',
        ext: 'js,json,hbs',
        watch: [
            'core/'
        ],
        ignore: [
            'core/client/',
            'core/server/test/',
            'core/server/views/',
            'core/built/'
        ]
    }).on('restart', function () {
        gulp.src(paramConfig.ghost.path + '/')
            .pipe(livereload());
    }).on('crash', function () {
        console.info(chalk.red('Stopping server due to an error 💥 ...'));
        if (ember) {ember.kill();}
        this.emit('quit');
        process.exit();
    }).on('exit', function () {
        console.info(chalk.cyan('Shutting down 🏁 ...'));
    });
};

// Filter against our paramConfig (checks the type and the allowed repos that can be
// used as parameters, e. b. `--admin`).
// Returns an Object which contains only the valid arguments as well as their value
// TODO: Make this awesome and reuse it to have options and parameters all over our gulp
// tooling!
filterParams = function (args) {
    var filteredOptions = {};

    _.forEach(args, function (key, value) {
        key = typeof key === 'string' ? key.toLowerCase().trim() : key;
        value = typeof value === 'string' ? value.toLowerCase().trim() : value;

        if (paramConfig.hasOwnProperty(value)) {
            if (paramConfig[value].type !== typeof key) {
                // TODO: instead of forbidding the usage of a repo param, she should
                // detect the current branch (that's no problem for the ghost repo,
                // but detecting it for submodules?)
                console.info(chalk.red('Invalid usage of "--' + value + '" option.'));
                return;
            }
            filteredOptions[value] = key;
        } else {
            if (value !== '_') { console.info(chalk.red('Invalid parameter "--' + value + '".')); }
            return;
        }
    });
    return filteredOptions;
};

// Creates the shell command to checkout the branch/pr and is verified against
// the regex in the paramConfig.
getGitCommand = function (branchToCheckOut, repo) {
    if (branchToCheckOut && branchToCheckOut.match(paramConfig[repo].regex)) {
        // Case: branch param is a PR (e. g. `pr/1234`)
        _.assign(gitBranches[repo], {
            gitCommand: 'f() { git fetch && git checkout ' + branchToCheckOut + '; }; f',
            branch: branchToCheckOut
        });
    } else if (branchToCheckOut) {
        // Case: branch param is a normal branch
        _.assign(gitBranches[repo], {
            gitCommand: 'git fetch && git checkout ' + branchToCheckOut,
            branch: branchToCheckOut
        });
    }
};

// Checks if a directory exists and returns true if so. This is needed to
// check, if the submodule directories exist.
checkDirectoryExistance = function (directory) {
    try {
        return fs.statSync(directory).isDirectory();
    } catch (e) {
        if (e.code === 'ENOENT') {
            return false;
        } else {
            return swallowError(e);
        }
    }
};

// *****************************************************************************
// ------------ Utility tasks --------------------------------------------------
// *****************************************************************************

gulp.task('_admin:build', function () {
    var env = Object.create(process.env);

    env.CI = false;

    console.info(chalk.cyan('Starting Ghost-Admin engines 🚗 ...'));

    ember = spawn('ember', ['build', '--watch'], {
        cwd: paramConfig.admin.path,
        env: env
    });

    ember.stdout.on('data', function (data) {
        console.info(chalk.green(data));
    });

    ember.stderr.on('data', function (data) {
        console.info(chalk.green(data));
    });

    ember.on('close', function (code) {
        console.info(chalk.red('Shutting down Ghost-Admin with ' + code));
    });
});

// Deletes all dependencies and installs npm modules for ghost again, to
// make gulp work again 😛).
gulp.task('_FFS', function (cb) {
    console.info(chalk.cyan('Please be patient my young Padawan. This will take a little while ⏲ ...'));
    exec('rm -rf node_modules && rm -rf core/client/node_modules ' +
        '&& rm -rf core/client/bower_components && npm cache clean ' +
        '&& bower cache clean && npm install', function (err, stdout, stderr) {
            if (stdout) {console.info(chalk.green(stdout));}
            if (stderr) {console.info(chalk.red(stderr));}
            if (err) {swallowError(err, false);}
            cb();
        });
});

gulp.task('_checkout:ghost', function (cb) {
    if (gitBranches.ghost.gitCommand) {
        console.info(chalk.cyan('Checking out ') + chalk.red('"' + gitBranches.ghost.branch + '" ') + chalk.cyan('on Ghost...'));
        exec(gitBranches.ghost.gitCommand, function (err, stdout, stderr) {
            if (!stdout) {
                console.info(chalk.red(stderr));
            } else {
                console.info(chalk.green(stdout) + '\n ' + chalk.red(stderr));
            }
            if (err) {swallowError(err, false);}
            cb();
        });
    } else {
        cb();
    }
});

gulp.task('_checkout:admin', function (cb) {
    if (gitBranches.admin.gitCommand) {
        console.info(chalk.cyan('Checking out ') + chalk.red('"' + gitBranches.admin.branch + '" ') + chalk.cyan('on Ghost-Admin...'));
        exec('cd ' + paramConfig.admin.path + ' && ' + gitBranches.admin.gitCommand, function (err, stdout, stderr) {
            if (!stdout) {
                console.info(chalk.red(stderr));
            } else {
                console.info(chalk.green(stdout) + '\n ' + chalk.red(stderr));
            }
            if (err) {swallowError(err, false);}
            cb();
        });
    } else {
        cb();
    }
});

gulp.task('_checkout:casper', function (cb) {
    if (gitBranches.casper.gitCommand) {
        console.info(chalk.cyan('Checking out ') + chalk.red('"' + gitBranches.casper.branch + '" ') + chalk.cyan('on Casper...'));
        exec('cd ' + paramConfig.casper.path + ' && ' + gitBranches.casper.gitCommand, function (err, stdout, stderr) {
            if (!stdout) {
                console.info(chalk.red(stderr));
            } else {
                console.info(chalk.green(stdout) + '\n ' + chalk.red(stderr));
            }
            if (err) {swallowError(err, false);}
            cb();
        });
    } else {
        cb();
    }
});

gulp.task('_checkout:branches', function (cb) {
    runSequence('_checkout:ghost', '_checkout:admin', '_checkout:casper', function (err) {
        if (err) {
            swallowError(err, true);
        } else {
            cb();
        }
    });
});

gulp.task('_deps:client', function (cb) {
    console.info(chalk.cyan('Updating Ghost-Admin dependencies 🛠 ...'));
    exec('cd ' + paramConfig.admin.path + ' && npm install && bower install', function (err, stdout, stderr) {
        if (stdout) {console.info(chalk.green(stdout));}
        if (stderr) {console.info(chalk.red(stderr));}
        if (err) {swallowError(err, false);}
        cb();
    });
});

gulp.task('_deps:ghost', function (cb) {
    console.info(chalk.cyan('Updating Ghost dependencies 🛠 ...'));
    exec('npm install', function (err, stdout, stderr) {
        if (stdout) {console.info(chalk.green(stdout));}
        if (stderr) {console.info(chalk.red(stderr));}
        if (err) {swallowError(err, false);}
        cb();
    });
});

gulp.task('_setup:basic', ['submodules'], function (cb) {
    runSequence('_checkout:branches', 'deps', function (err) {
        if (err) {
            swallowError(err, true);
        } else {
            cb();
        }
    });
});

gulp.task('_setup:force', ['submodules'], function (cb) {
    runSequence('_FFS', '_checkout:branches', 'deps', function (err) {
        if (err) {
            swallowError(err, true);
        } else {
            cb();
        }
    });
});

// *****************************************************************************
// ------------ Begin public tasks ---------------------------------------------
// *****************************************************************************

// Starting the 🚗 to run the server only
// No client watch here.
gulp.task('server', 'Run Ghost server in development with livereload but without client build', function () {
    console.info(chalk.cyan('Starting Ghost engines 🚗 ...'));
    nodemonServerInit();
});

// Run `gulp dev` to enter development mode
// Filechanges in client will force a livereload
// Call it with `--deps` or `-d` to install dependencies as well`
gulp.task('dev', 'Runs Ghost server in development with livereload and client rebuild on file changes', function (cb) {
    console.info(chalk.cyan('Development mode for Ghost will start right meow 👻 ...'));
    if (argv.deps || argv.d) {
        runSequence(
            'submodules',
            'deps',
            '_admin:build',
            'server',
            cb
        );
    } else {
        runSequence(
            'submodules',
            '_admin:build',
            'server',
            cb
        );
    }
}, {
    options: {
        deps: '[-d] Install core and client dependencies'
    }
});

// Update the submodules with gulp-git-submodule
// Will update only for these cases:
// 1. submodule param is set to master (`--admin master`, or `-a master`)
// 2. submodule doesn't exist, even if submodule param is given
// Can be called directly, but will only update, if submodule doesn't exist.
// Can be called with `--force` or `-f` to force and update of the submodules
gulp.task('submodules', 'Updates Ghost submodules, if submodule directory is not found', function (cb) {
    var adminBranch = gitBranches.admin.branch || undefined,
        casperBranch = gitBranches.casper.branch || undefined,
        force = (argv.force || argv.f) || undefined;

    if ((!checkDirectoryExistance(paramConfig.admin.path) || adminBranch === 'master') ||
        (!checkDirectoryExistance(paramConfig.casper.path) || casperBranch === 'master') || force) {
        exec('gulp sm:install', function (err, stdout, stderr) {
            console.info(chalk.cyan('Updating Ghost submodules 🛠 ...'));
            if (stderr) {console.info(chalk.red(stderr));}
            if (err) {swallowError(err, false);}
            cb();
        });
    } else {
        console.info(chalk.cyan('No need to update Ghost submodules 🏄🏼 ...'));
        cb();
    }
}, {
    options: {
        force: '[-f] Force submodules install'
    }
});

// Task to update dependencies for ghost and admin
// Can be called with `--force` or `-f` to force a delete of the dependencies and
// fresh install afterwards
gulp.task('deps', 'Installs Ghost and Ghost-Admin dependencies', function (cb) {
    if (argv.force || argv.f) {
        runSequence('_FFS', '_deps:client', '_deps:ghost', cb);
    } else {
        runSequence('_deps:client', '_deps:ghost', cb);
    }
}, {
    options: {
        force: '[-f] Force a fresh install of all dependencies. Deletes the dependencies, the cache, and installs it back again.'
    }
});

// Task to make repositories ready for development. Can be used in mutliple ways:
//
// `gulp setup`
// Will update dependecies and submodules (if submodule branches are on master) for
// currently chosen branches.
//
// `gulp setup --force`
// Will delete all dependencies and install them again, incl. submodules for
// currently chosen branches.
//
// `gulp setup --ghost some-branch --admin some-branch --casper some-branch`
// Will checkout the branches for each repository.
// Can also be used to checkout only selected branches e. g.
// `gulp setup --admin some-branch`
// Will leave the current branch for `ghost` and `casper`, but checkout the named
// branch for admin. Will also install dependencies.
//
// `gulp setup --admin pr/123 --ghost pr/1234 --casper pr/123`
// Will fetch the named PR of the repository and checkout to this new branch.
// Will also install dependencies. NOTE: This works only with an additional fetch line
// in the .git/config file for each repository: `fetch = +refs/pull/*/head:refs/remotes/upstream/pr/*`.
// See https://dev.ghost.org/easy-git-pr-test/ for further information.
//
// `gulp setup -a some-branch -c pr/123 -g pr/1234`
// ^ The parameters work fine with their abbreviations.
//
// All the combinations above can be executed with the `--force` or `-f` flag, which
// will delete the dependencies and install them again, but for the chosen branches.
gulp.task('setup', 'Prepares everything for development. Checks out different branches ' +
                    'per repository, installs submodules and dependencies.', function (cb) {
    var options = filterParams(argv) || {},
        force = (options.force || options.f) || undefined,
        branchToCheckOut;

    // We have to set argv back, otherwise they might be used for further called
    // task, which we don't want
    argv = {};

    if (options.ghost || options.g) {
        branchToCheckOut = options.ghost || options.g;
        getGitCommand(branchToCheckOut, 'ghost');
    }

    if (options.admin || options.a) {
        branchToCheckOut = options.admin || options.a;
        getGitCommand(branchToCheckOut, 'admin');
    }

    if (options.casper || options.c) {
        branchToCheckOut = options.casper || options.c;
        getGitCommand(branchToCheckOut, 'casper');
    }

    if (force) {
        runSequence('_setup:force', function (err) {
            if (err) {
                swallowError(err, true);
            } else {
                cb();
            }
        });
    } else {
        runSequence('_setup:basic', function (err) {
            if (err) {
                swallowError(err, true);
            } else {
                cb();
            }
        });
    }
}, {
    options: {
        force: '[-f] Force a fresh install of all dependencies',
        'ghost=foo-branch': '[-g] Checks out a local branch for Ghost core and installs dependencies. Branch `master` will update submodules',
        'ghost=pr/1234': '[-g] Checks out `pr/1234` for Ghost core and installs dependencies',
        'admin=foo-branch': '[-a] Checks out a local branch for Ghost-Admin and installs dependencies. Branch `master` will update submodules',
        'admin=pr/1234': '[-a] Checks out `pr/1234` for Ghost-Admin and installs dependencies',
        'casper=foo-branch': '[-c] Checks out a local branch for Casper and installs dependencies. Branch `master` will update submodules',
        'casper=pr/1234': '[-c] Checks out `pr/1234` for Casper and installs dependencies'
    }
});

gulp.task('jscs', 'Code Style check of Ghost core JavaScript', function () {
    return gulp.src(
        [
            '*.js',
            '!config*.js',
            'core/*.js',
            'core/server/**/*.js',
            'core/test/**/*.js',
            '!core/test/coverage/**',
            '!core/shared/vendor/**/*.js'
        ])
        .pipe(jscs('.jscsrc'))
        .pipe(jscs.reporter())
        .pipe(jscs.reporter('failImmediately'));
});

gulp.task('jshint', 'Linting of Ghost core JavaScript', function () {
    return gulp.src(
        [
            '*.js',
            '!config*.js',
            'core/*.js',
            'core/server/**/*.js',
            'core/test/**/*.js',
            '!core/test/coverage/**',
            '!core/shared/vendor/**/*.js'
        ])
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('json', 'Linting of Ghost core JSON', function () {
    return gulp.src(
        [
            '*.json',
            'core/*.json',
            'core/server/**/*.json',
            'core/test/**/*.json',
            '!core/test/utils/fixtures/import/zips/**/*.json',
            '!core/test/coverage/**',
            '!core/shared/vendor/**/*.json'
        ])
        .pipe(jsonlint())
        .pipe(jsonlint.reporter());
});

gulp.task('lint', 'Linting and code style check of all Ghost core JavaScript and JSON', function (cb) {
    console.info(chalk.cyan('Starting linting and code style checker 🎨 ...'));
    runSequence(['jscs', 'jshint', 'json'], function (err) {
        if (err) {
            swallowError(err, false);
        } else {
            console.info(chalk.green('No code or style errors ✅'));
            cb();
        }
    });
});

// Default task at the moment is development.
// TODO: As soon as we have a production build task, we should
// check the current environment and use the production build as
// default pro prod environment.
gulp.task('default', ['dev']);
