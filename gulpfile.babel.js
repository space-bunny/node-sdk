const gulp = require('gulp');
const gutil = require('gulp-util');
const gulpJsdoc2md = require('gulp-jsdoc-to-markdown');
const rename = require('gulp-rename');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const makeWebpackConfig = require('./make-webpack.config');
const path = require('path');
const del = require('del');
const minimist = require('minimist');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');

// The development server (the recommended option for development)
gulp.task('default', ['webpack-dev-server']);

// Production build
gulp.task('build', ['webpack:build']);

gulp.task('webpack:build', ['transpile'], function(callback) {
  const knownOptions = {
    string: [ 'dist-path' ],
    default: { 'dist-path': path.join(__dirname, 'dist') }
  };

  const options = minimist(process.argv.slice(2), knownOptions);

  // Webpack prodution build configuration
  const prodBuildConfig = makeWebpackConfig({
    outputPath: path.join(options['dist-path']),
    publicPath: path.join('/')
  });

  // Remove all files from output path
  del([path.join(options['dist-path'], '**', '*')]);

  // Copy all files from web to output path
  gulp.src('public/**').pipe(gulp.dest(options['dist-path']));

  // run webpack
  webpack(prodBuildConfig, function(err, stats) {
    if (err) {
      throw new gutil.PluginError('webpack:build', err);
    }
    gutil.log('[webpack:build]', stats.toString({
      colors: true
    }));

    callback();
  });
});

gulp.task('webpack-dev-server', function() {
  const knownOptions = {
    string: ['hot', 'port', 'host'],
    default: { hot: 'hot', host: '0.0.0.0', port: '8000' }
  };

  const options = minimist(process.argv.slice(2), knownOptions);

  // Webpack development server configuration
  const devServerConfig = makeWebpackConfig({
    devServer: true,
    hotComponents: options.hot,
    devPort: options.port,
    devHost: options.host,
    outputPath: path.join(__dirname, 'dist'),
    publicPath: 'dist/'
  });

  // Start a webpack-dev-server
  new WebpackDevServer(webpack(devServerConfig), {
    publicPath: '/' + devServerConfig.output.publicPath,
    hot: true,
    stats: {
      colors: true
    }
  }).listen(options.port, options.host, function(err) {
    if (err) {
      console.log(err); // eslint-disable-line no-console
      throw new gutil.PluginError('webpack-dev-server', err);
    }
    // gutil.log("[webpack-dev-server]", "http://localhost:8080/webpack-dev-server/index.html");
    gutil.log('[webpack-dev-server]', 'http://' + options.host + ':' + options.port + '/index.html');
  });
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

const paths = {
  src: path.join(__dirname, 'src', '**', '*.js'),
  dest: path.join(__dirname, 'lib'),
  sourceRoot: path.join(__dirname, 'src')
};

gulp.task('transpile', function() {
  // Remove all compiled files from lib
  del([path.join(__dirname, 'lib', '**', '*.js')]);
  return gulp.src(paths.src)
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: ['babel-preset-es2015']
    }))
    .pipe(sourcemaps.write('.', { sourceRoot: paths.sourceRoot }))
    .pipe(gulp.dest(paths.dest));
});

gulp.task('watch', function() {
  gulp.watch(paths.src, ['webpack:build']);
});
