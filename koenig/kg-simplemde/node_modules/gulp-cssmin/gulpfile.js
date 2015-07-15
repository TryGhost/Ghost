var gulp = require('gulp');
var cssmin = require('./');
var rename = require('gulp-rename');

gulp.task('default', function () {
    gulp.src('./sample/type.css')
        .pipe(cssmin())
				.pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('./sample'));
});
