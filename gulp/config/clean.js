'use strict';

var gulp = require('gulp');
var del = require('del');

gulp.task('clean', function (done) {
    del(['demo/vendor', 'dist/'], done);
});