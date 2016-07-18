// Include gulp
var gulp = require('gulp');

// Plugins
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var minifycss = require('gulp-minify-css');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var svgmin = require('gulp-svgmin');
var header = require('gulp-header');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var cache = require('gulp-cache');
var runsequence = require('run-sequence');
var del = require('del');

var pkg = require('./package.json');
var banner = [
  '/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @homepage <%= pkg.homepage %>',
  ' * @copyright ' + (new Date()).getFullYear() + ' <%= pkg.author.name %> ' ,
  ' * @license <%= pkg.license %>',
  ' */',
  '\n'
].join('\n');

var files = {
    lint: [
        'gulpfile.js',
        'package.json',
        'assets/js/bastard.js'
    ],
    sass: [
        'assets/sass/**/*.scss'
    ],
    css: [
        'assets/bower_components/highlightjs/styles/railscasts.css',
        'assets/css/compiled_sass.css'
    ],
    js: [
        'assets/bower_components/bootstrap-sass/assets/javascripts/bootstrap.js',
        'assets/bower_components/highlightjs/highlight.pack.js',
        'assets/js/jquery.fitvids.js',
        'assets/js/jquery.parallax-1.1.3.js',
        'assets/js/jquery.easing.1.3.js',
        'assets/js/bastard.js'
    ],
    images: [
        'image_sources/{,*/}*.jpg',
        'image_sources/{,*/}*.png'
    ],
    svgs: [
        'image_sources/{,*/}*.svg',
        'image_sources/{,*/}*.svg'
    ],
    fonts: [
        'assets/bower_components/bootstrap-sass/assets/fonts/**/*'
    ],
    clean: [
        'assets/css/compiled_sass.css',
        'assets/css/bastard.min.css',
        'assets/js/scripts.js',
        'assets/js/scripts.min.js'
    ]
};

// Lint Task
gulp.task('lint', function() {
    return gulp.src(files.lint)
         .pipe(jshint())
         .pipe(jshint.reporter('default'));
});

// Compile Our Sass
gulp.task('compile_sass', function() {
    return gulp.src(files.sass)
        .pipe(sass({style: 'expanded', quiet: true, cacheLocation: '.sass-cache'}))
        .pipe(sass())
        .pipe(autoprefixer('last 1 version'))
        .pipe(rename('compiled_sass.css'))
        .pipe(gulp.dest('assets/css'));
});

// Concatenate & minify css files
gulp.task('concat_css', function() {
    return gulp.src(files.css)
        .pipe(concat('bastard.css'))
        .pipe(header(banner, { pkg : pkg }))
        .pipe(gulp.dest('assets/css'))
        .pipe(minifycss({keepSpecialComments: 0}))
        .pipe(rename({suffix: '.min'}))
        .pipe(header(banner, { pkg : pkg }))
        .pipe(gulp.dest('assets/css'));
});

gulp.task('css', function() {
    runsequence(
        'compile_sass',
        'concat_css'
    );
});

// Concatenate & Minify JS
gulp.task('scripts', function() {
    return gulp.src(files.js)
        .pipe(concat('scripts.js'))
        .pipe(header(banner, { pkg : pkg }))
        .pipe(gulp.dest('assets/js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(header(banner, { pkg : pkg }))
        .pipe(gulp.dest('assets/js'));
});


// Images
gulp.task('imgmin', function() {
    return gulp.src(files.images)
        .pipe(cache(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true })))
        .pipe(gulp.dest('assets/images'));
});

// Images
gulp.task('svgmin', function() {
    return gulp.src(files.svgs)
        .pipe(cache(svgmin()))
        .pipe(gulp.dest('assets/images'));
});

// Fonts
gulp.task('fonts', function() {
    return gulp.src(files.fonts)
        .pipe(gulp.dest('assets/fonts'));
});

// Watch Files For Changes
gulp.task('watch', ['default'], function() {
    gulp.watch(files.lint, ['scripts']);
    gulp.watch(files.sass, ['css']);
});

// Clean
gulp.task('clean', function() {
    return del(files.clean);
});

// Default Task
gulp.task('default', function() {
    gulp.start('lint', 'css', 'scripts', 'imgmin', 'svgmin', 'fonts');
});
