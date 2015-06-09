"use strict";
var fs = require("fs");
var gulp = require("gulp");
var gutil = require("gulp-util");
var gulpJsdoc2md = require("gulp-jsdoc-to-markdown");
var rename = require("gulp-rename");
var concat = require("gulp-concat");
var uglify = require('gulp-uglify');

gulp.task("docs", function(){
  return gulp.src(["index.js","lib/*.js", "lib/*/*.js"])
    .pipe(gulpJsdoc2md())
    .on("error", function(err){
        gutil.log(gutil.colors.red("jsdoc2md failed"), err.message)
    })
    .pipe(rename(function(path){
        path.extname = ".md";
    }))
    .pipe(gulp.dest("docs"));
});

gulp.task('compress', function() {
  return gulp.src('dist/spacebunny.js')
    .pipe(uglify())
    .pipe(gulp.dest('dist/min'))
    .pipe(gulp.dest('examples/web_stomp'));
});
