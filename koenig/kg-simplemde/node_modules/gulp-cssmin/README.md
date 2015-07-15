# gulp-cssmin

**Duplicate of gulp-minify-css**

[![Build Status](https://travis-ci.org/chilijung/gulp-cssmin.png?branch=master)](https://travis-ci.org/chilijung/gulp-cssmin)

minify css using gulp.

## Install

Install with [npm](https://npmjs.org/package/gulp-cssmin)

```
npm install --save-dev gulp-cssmin
```


## Example

```js
var gulp = require('gulp');
var cssmin = require('gulp-cssmin');
var rename = require('gulp-rename');

gulp.task('default', function () {
	gulp.src('src/**/*.css')
		.pipe(cssmin())
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('dist'));
});
```


## API

### cssmin(options)

See the css-min [options](https://github.com/GoalSmashers/clean-css).

## Other options

- Show loging

`showLog` : (True, false) to trun on or off of the log

## Inspired by

- https://github.com/sindresorhus/gulp-imagemin

- https://github.com/gruntjs/grunt-contrib-cssmin

## License

MIT [@chilijung](http://github.com/chilijung)
