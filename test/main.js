/* @flow */
/*global describe, it*/
'use strict';

require('mocha');
var fs = require('fs');
var flow = require('../lib/');
var path = require('path');
var should = require('should');
var gutil = require('gulp-util');
var es = require('event-stream');
var flowBin = require('flow-bin');
var execFile = require('child_process').execFile;


delete require.cache[require.resolve('../')];

var log = console.log;
var stringError = false;
var moduleError = false;
var iterationError = false;

console.log = function () {
  Array.prototype.slice.call(arguments).forEach(function (arg) {
    if (/string/.test(arg)) stringError = true;
    if (/Required/.test(arg)) moduleError = true;
    if (/iteration/.test(arg)) iterationError = true;
  });
  log.apply(console, arguments);
};

describe('gulp-flow', function () {
  this.timeout(5000);

  it('should produce expected file via buffer', function (done) {

    var srcFile = getFixture('hello.js');

    var stream = flow({
      beep: false
    });

    stream.on('error', function (err) {
      should.exist(err);
      done(err);
    });

    stream.on('data', function (newFile) {
      should.exist(newFile);
      should.exist(newFile.contents);
    });

    stream.on('end', function () {
      setTimeout(function () {
        should.equal(stringError, true);
        should.equal(iterationError, true);
        done();
      }, 500);
    });
    stream.write(srcFile);
    stream.end();
  });

  it('should error on stream', function (done) {

    var srcFile = new gutil.File({
      path: 'test/fixtures/hello.js',
      cwd: 'test/',
      base: 'test/fixtures',
      contents: fs.createReadStream('test/fixtures/hello.js')
    });

    var stream = flow({
      beep: false
    });

    stream.on('error', function (err) {
      should.exist(err);
      done();
    });

    stream.on('data', function (newFile) {
      newFile.contents.pipe(es.wait(function (err, data) {
        done(err);
      }));
    });

    stream.write(srcFile);
    stream.end();
  });

  it('should be able to check with declarations', function (done) {
    assertFile(getFixture('declaration.js'), {
      beep: false
    }, function () {
      should.equal(moduleError, true);
      moduleError = false;
      assertFile(getFixture('declaration.js'), {
        declarations: './test/fixtures/interfaces',
        beep: false
      }, function () {
        should.equal(moduleError, false);
        done();
      });
    });
  });

  it('should able to detect broken declarations', function (done) {
    assertFile(getFixture('declaration.js'), {
      beep: false
    }, function () {
      should.equal(moduleError, true);
      moduleError = false;
      assertFile(getFixture('declaration.js'), {
        declarations: './test/fixtures/broken-interfaces',
        beep: false
      }, function () {
        should.equal(moduleError, false);
        done();
      });
    });
  });

  it('should kill flow after running', function (done) {
    assertFile(getFixture('declaration.js'), {
      killFlow: true,
      beep: false
    }, function () {
      execFile(flowBin, ['status', '--no-auto-start'], {
        cwd: 'test'
      }, function(err, stdout, stderr) {
        should.equal(/no flow server running/.test(stderr.toLowerCase()), true);
        done();
      });
    });
  });

  /**
   * Get file from fixtures
   *
   * @param  {string} name fixture file name
   *
   * @return {Vinyl} file object
   */
  function getFixture(name) {
    var _path = '/' + path.relative('/', 'test/fixtures/' + name);
    return new gutil.File({
      path: _path,
      cwd: 'test/',
      base: 'test/fixtures',
      contents: fs.readFileSync(_path)
    });
  }

  /**
   * Test file with flow
   *
   * @param  {Vinyl}    srcFile     file object
   * @param  {Object}   flowOptions flow options
   * @param  {Function} callback    execution callback
   */
  function assertFile(srcFile, flowOptions, callback) {
    var stream = flow(flowOptions);
    stream.on('error', function (err) {
      should.exist(err);
      callback(err);
    });

    stream.on('data', function (newFile) {
      should.exist(newFile);
      should.exist(newFile.contents);
    });

    stream.on('end', function () {
      setTimeout(function () {
        callback();
      }, 1000);
    });
    stream.write(srcFile);
    stream.end();
  }
});
