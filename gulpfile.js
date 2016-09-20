var gulp                = require('gulp'),
    livereload          = require('gulp-livereload'),
    nodemon             = require('gulp-nodemon'),
    shell               = require('gulp-shell'),
    chalk               = require('chalk'),
    paths,
    nodemonServerInit;

paths = {
    server: 'core/server/',
    client: 'core/client/'
};

nodemonServerInit = function () {
    livereload.listen();

    return nodemon({
        script: 'index.js',
        ext: 'js,json,hbs',
        watch: [
            'core/index.js',
            paths.server + '**/*.js',
            paths.server + '**/*.json',
            paths.server + '**/*.hbs',
            'core/built/assets/*.js'
        ],
        ignore: [
            'core/client/*',
            'core/server/test/*'
        ]
    }).on('restart', function () {
        console.info(chalk.cyan('Restarting Ghost due to changes...'));
        gulp.src('index.js')
            .pipe(livereload());
    });
};

// Starting the 🚗 to run the server only
// No client watch here.
gulp.task('server', function () {
    nodemonServerInit();
});

// Run `gulp dev` to enter development mode
// Filechanges in client will force a livereload
gulp.task('dev', ['server'], shell.task(['ember build --watch'], {
    cwd: paths.client,
    env: {
        FORCE_COLOR: true // this is a fun little tidbit that will pass the colors from Ember to the main process
    }
}));
