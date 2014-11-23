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
    .pipe(flow());
});
```

## Release History
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
