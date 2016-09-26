var gulp                = require('gulp'),
    livereload          = require('gulp-livereload'),
    nodemon             = require('gulp-nodemon'),
    shell               = require('gulp-shell'),
    chalk               = require('chalk'),
    runSequence         = require('run-sequence'),
    argv                = require('minimist')(process.argv.slice(2)),
    _                   = require('lodash'),
    exec                = require('child_process').exec,
    submodule           = require('gulp-git-submodule'),
    fs                  = require('fs'),
    config,
    gitBranches,
    nodemonServerInit,
    filterParams,
    getGitBranch,
    checkDirectoryExistance;

// This config is used to store constant values to check against
// called options as well as the paths for each repository
config = {
    ghost: {
        type: 'string',
        regex: /pr\/\d+/i,
        path: 'core/server'
    },
    admin: {
        type: 'string',
        regex: /pr\/\d+/i,
        path: 'core/client'
    },
    casper: {
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

nodemonServerInit = function () {
    livereload.listen();

    return nodemon({
        script: 'index.js',
        ext: 'js,json,hbs',
        watch: [
            // TODO: these are the files we're watching. These need probably some
            // adjustment as we go ahead with this.
            'core/index.js',
            config.ghost.path + '**/*.js',
            config.ghost.path + '**/*.json',
            config.ghost.path + '**/*.hbs',
            'core/built/assets/*.js'
        ],
        ignore: [
            'core/client/*',
            'core/server/test/*'
        ],
        verbose: true
    }).on('restart', function () {
        console.info(chalk.cyan('Restarting Ghost due to changes...'));
        gulp.src('index.js')
            .pipe(livereload());
    });
};

// Filter against our config (checks the type and the allowed repos that can be
// used as parameters, e. b. `--admin`).
// Returns an Object which contains only the valid arguments as well as their value
filterParams = function (args) {
    var filteredOptions = {};

    _.forEach(args, function (key, value) {
        key = typeof key === 'string' ? key.toLowerCase().trim() : key;
        value = typeof value === 'string' ? value.toLowerCase().trim() : value;

        if (config.hasOwnProperty(value)) {
            if (config[value].type !== typeof key) {
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
// the regex in the config.
getGitBranch = function (branch, repo) {
    if (branch && branch.match(config[repo].regex)) {
        _.assign(gitBranches[repo], {
            gitCommand: 'f() { git fetch && git checkout ' + branch + '; }; f',
            branch: branch
        });
    } else if (branch) {
        _.assign(gitBranches[repo], {
            gitCommand: 'git fetch && git checkout ' + branch,
            branch: branch
        });
    } else {
        return null;
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
            throw e;
        }
    }
};

// Delete all dependencies and installs npm modules again (necessary to make gulp
// work again 😛).
gulp.task('_FFS', shell.task(['rm -rf node_modules && rm -rf core/client/node_modules ' +
                            '&& rm -rf core/client/bower_components && npm cache clean ' +
                            '&& bower cache clean && npm install']));

gulp.task('_checkout_ghost', function (cb) {
    exec(gitBranches.ghost.gitCommand, function (err, stdout, stderr) {
        console.info(chalk.red(stderr));
        cb(err);
    });
});

gulp.task('_checkout_admin', function (cb) {
    // Check first, if submodule exists and update it, if not.
    if (!checkDirectoryExistance(config.admin.path)) {
        exec('gulp submodules', function (err, stdout, stderr) {
            console.info(chalk.red(stderr));
            exec('cd ' + config.admin.path + ' && ' + gitBranches.admin.gitCommand, function (err, stdout, stderr) {
                console.info(chalk.green(stdout));
                console.info(chalk.red(stderr));
                cb(err);
            });
        });
    } else {
        exec('cd ' + config.admin.path + ' && ' + gitBranches.admin.gitCommand, function (err, stdout, stderr) {
            console.info(chalk.green(stdout));
            console.info(chalk.red(stderr));
            cb(err);
        });
    }
});

gulp.task('_checkout_casper', function (cb) {
    // Check first, if submodule exists and update it, if not.
    if (!checkDirectoryExistance(config.casper.path)) {
        exec('gulp submodules', function (err, stdout, stderr) {
            console.info(chalk.red(stderr));
            exec('cd ' + config.casper.path + ' && ' + gitBranches.casper.gitCommand, function (err, stdout, stderr) {
                console.info(chalk.green(stdout));
                console.info(chalk.red(stderr));
                cb(err);
            });
        });
    } else {
        exec('cd ' + config.casper.path + ' && ' + gitBranches.casper.gitCommand, function (err, stdout, stderr) {
            console.info(chalk.green(stdout));
            console.info(chalk.red(stderr));
            cb(err);
        });
    }
});

gulp.task('_client_deps', shell.task(['npm install && bower install'], {
    cwd: config.admin.path,
    env: {
        FORCE_COLOR: true
    }
}));

// Starting the 🚗 to run the server only
// No client watch here.
gulp.task('server', function () {
    nodemonServerInit();
});

// Run `gulp dev` to enter development mode
// Filechanges in client will force a livereload
gulp.task('dev', ['server'], shell.task(['ember build --watch'], {
    cwd: config.admin.path,
    env: {
        FORCE_COLOR: true
    }
}));

// Update the submodules with gulp-git-submodule
// Will update only for these cases:
// 1. admin param is set to master (`--admin master`)
// 2. submodule doesn't exist, even if admin param is given
// Can be called directly, but will checkout the master branch
gulp.task('submodules', function (cb) {
    var adminBranch = gitBranches.admin.branch || undefined,
        casperBranch = gitBranches.casper.branch || undefined;

    if ((!checkDirectoryExistance(config.admin.path) || adminBranch === 'master') ||
        (!checkDirectoryExistance(config.casper.path) || casperBranch === 'master')) {
        console.info(chalk.cyan('Updating submodules...'));
        exec('gulp sm:install', function (err, stdout, stderr) {
            console.info(chalk.red(stderr));
            cb(err);
        });
    } else {
        console.info(chalk.cyan('Nothing to update...'));
        cb();
    }
});

// Task to update dependencies for ghost and admin
gulp.task('deps', ['_client_deps'], shell.task(['npm install']));

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
// All the combinations above can be executed with the `--force` or `-f` flag, which
// will delete the dependencies and install them again, but for the chosen branches.
gulp.task('setup', function (done) {
    var options = filterParams(argv) || {},
        force = (options.force || options.f) || undefined;

    if (options.ghost) {
        getGitBranch(options.ghost, 'ghost');
        runSequence(
            '_checkout_ghost'
        );
    }

    if (options.admin) {
        getGitBranch(options.admin, 'admin');
        runSequence(
            '_checkout_admin'
        );
    }

    if (options.casper) {
        getGitBranch(options.casper, 'casper');
        runSequence(
            '_checkout_casper'
        );
    }

    if (force) {
        runSequence(
            'submodules',
            '_FFS',
            'deps',
            done
        );
    } else {
        runSequence(
            'submodules',
            'deps',
            done
        );
    }
});
