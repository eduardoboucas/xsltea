'use strict';

// --------------------------------------------------------------
// Dependencies
// --------------------------------------------------------------

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

// --------------------------------------------------------------
// Compile Sass
// --------------------------------------------------------------

gulp.task('sass', function () {
    return gulp.src([
        'sass/main.scss'
    ])
    .pipe(plugins.sass({
        outputStyle: 'compressed'
    }).on('error', plugins.sass.logError))
    .pipe(plugins.autoprefixer({
        browsers: ['last 2 versions'],
        cascade: false
    }))
    .pipe(gulp.dest('css'));
});

// --------------------------------------------------------------
// Concatenate/minify JS
// --------------------------------------------------------------

gulp.task('scripts', function() {
    return gulp.src([
            './public/js/main.js',
            './public/js/templates/*.js',
            './public/components/dustjs-linkedin/dist/dust-core.min.js',
            './public/components/dustjs-helpers/dist/dust-helpers.min.js',
        ])
        .pipe(plugins.concat('main.min.js'))
        .pipe(plugins.uglify())
        .pipe(gulp.dest('./public/js'));
});

// --------------------------------------------------------------
// Watch for changes
// --------------------------------------------------------------

gulp.task('watch', function() {
    gulp.watch(['sass/**/*.scss'], ['sass']);
});

// --------------------------------------------------------------
// Default task
// --------------------------------------------------------------

gulp.task('default', ['watch']);
