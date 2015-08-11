var gulp = require('gulp'),
    minifycss = require('gulp-minify-css'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat');

gulp.task('scripts', function() {
/*  var js_files = [
    './src/js/codemirror/*.js',
    './src/js/typo.js',
    './src/js/spell-checker.js',
    './src/js/marked.js',
    './src/js/simplemde.js'];*/

  var js_files = [
    './src/js/codemirror/codemirror.js',
    './src/js/codemirror/continuelist.js',
    './src/js/codemirror/fullscreen.js',
    './src/js/codemirror/markdown.js',
    './src/js/codemirror/overlay.js',
    './src/js/codemirror/gfm.js',
    './src/js/codemirror/xml.js',
    './src/js/typo.js',
    './src/js/spell-checker.js',
    './src/js/marked.js',
    './src/js/simplemde.js'];

  return gulp.src(js_files)
    .pipe(concat('simplemde.min.js'))
    .pipe(gulp.dest('dist'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

gulp.task('styles', function() {
  return gulp.src('./src/css/*.css')
    .pipe(concat('simplemde.min.css'))
    .pipe(gulp.dest('dist'))
    .pipe(minifycss())
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['scripts', 'styles']);

