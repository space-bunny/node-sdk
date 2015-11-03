const gulp = require('gulp');
const gutil = require('gulp-util');
const gulpJsdoc2md = require('gulp-jsdoc-to-markdown');
const rename = require('gulp-rename');
const path = require('path');
const del = require('del');
const uglify = require('gulp-uglify');
const babel = require('gulp-babel');
const webpack = require('webpack');
const sourcemaps = require('gulp-sourcemaps');
const makeWebpackConfig = require('./make-webpack.config');

gulp.task('default', ['build-all']);

gulp.task('build-all', ['build', 'webpack']);

const paths = {
  src: path.join(__dirname, 'src', '**', '*.js'),
  dest: path.join(__dirname, 'lib'),
  sourceRoot: path.join(__dirname, 'src')
};

gulp.task('build', function() {
  // Remove all compiled files from lib
  del([path.join(__dirname, 'lib', '**', '*.js')]);
  return gulp.src(paths.src)
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: ['babel-preset-es2015']
    }))
    .pipe(sourcemaps.write('.', { sourceRoot: paths.sourceRoot }))
    .pipe(gulp.dest(paths.dest));

  // const tasks = folders.map(function(element) {
  //   return gulp.src(element.src)
  //     .pipe(babel({
  //       presets: ['babel-preset-es2015']
  //     }))
  //     .pipe(sourcemaps.write('.', { sourceRoot: element.sourceRoot }))
  //     .pipe(gulp.dest(element.dest));
  // });
  // return merge(tasks);
});

gulp.task('watch', function() {
  gulp.watch(paths.src, ['build']);
});

gulp.task('webpack', ['build'], function(callback) {
  // run webpack
  webpack(makeWebpackConfig, function(err, stats) {
    if (err) throw new gutil.PluginError('webpack', err);
    gutil.log('[webpack]', stats.toString({
      // output options
      colors: true
    }));
    callback();
  });
});

gulp.task('compress', function() {
  return gulp.src('dist/spacebunny.js')
    .pipe(uglify())
    .pipe(gulp.dest('dist/min'))
    .pipe(gulp.dest('examples/web_stomp'));
});

gulp.task('docs', function() {
  return gulp.src(['index.js', 'src/**/*.js'])
    .pipe(gulpJsdoc2md())
    .on('error', function(err) {
      gutil.log(gutil.colors.red('jsdoc2md failed'), err.message);
    })
    .pipe(rename(function(filePath) {
      filePath.extname = '.md';
    }))
    .pipe(gulp.dest('docs'));
});
