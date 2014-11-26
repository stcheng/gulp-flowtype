## gulp-flowtype [![Build Status][travis-image]][travis-url] [![NPM version][npm-image]][npm-url] [![Dependency Status][depstat-image]][depstat-url]

> Run [Facebook's Flow](http://flowtype.org/) in your gulp pipeline

![gulp-flowtype example](screencap.gif)

## Installation
```shell
$ npm install --save-dev gulp-flowtype
```

### Usage

```js
var flow = require('gulp-flowtype');
gulp.task('typecheck', function() {
  return gulp.src('./*.js')
    .pipe(flow({
        all: false,
        weak: false,
        declarations: './lib/flow'
    }));
});
```

### Options

##### options.all
Type: `Boolean`
Default: `false`
>Typecheck all files, not just @flow.

##### options.weak
Type: `Boolean`
Default: `false`
>Typecheck with weak inference, assuming dynamic types by default.

##### options.weak
Type: `String`
Default: `empty`
>The path to declared files (interfaces) to third-party libraries

## Release History
 * 2014-11-25    v0.3.2    Tweak success message, check file has `/* @flow */` before running flow and added options
 * 2014-11-23    v0.3.1    Changes to previous formatting fix
 * 2014-11-23    v0.3.0    Fix formatting issues
 * 2014-11-21    v0.2.0    General improvements
 * 2014-11-19    v0.1.0    Initial release


## License

MIT © Charlie Dowler

[travis-url]: http://travis-ci.org/charliedowler/gulp-flowtype
[travis-image]: https://secure.travis-ci.org/charliedowler/gulp-flowtype.png?branch=master

[npm-url]: https://npmjs.org/package/gulp-flowtype
[npm-image]: https://badge.fury.io/js/gulp-flowtype.png

[travis-url]: http://travis-ci.org/charliedowler/gulp-flowtype
[travis-image]: https://secure.travis-ci.org/charliedowler/gulp-flowtype.png?branch=master

[depstat-url]: https://david-dm.org/charliedowler/gulp-flowtype
[depstat-image]: https://david-dm.org/charliedowler/gulp-flowtype.png
