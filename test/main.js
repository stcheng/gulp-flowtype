/* @flow */
/* global describe, it*/
'use strict';

require('mocha');
const fs = require('fs');
const flow = require('../lib/');
const path = require('path');
const gutil = require('gulp-util');
const es = require('event-stream');
const flowBin = require('flow-bin');
const execFile = require('child_process').execFile;

delete require.cache[require.resolve('../')];

const log = console.log;
let stringError = false;
let moduleError = false;
let iterationError = false;

console.log = function() {
  Array.prototype.slice.call(arguments).forEach((arg) => {
    if (/string/.test(arg)) stringError = true;
    if (/Required/.test(arg)) moduleError = true;
    if (/iteration/.test(arg)) iterationError = true;
  });
  log.apply(console, arguments);
};

describe('gulp-flow', function() {
  this.timeout(5000);

  it('should produce expected file via buffer', function(done) {
    const srcFile = getFixture('hello.js');

    const stream = flow({
      beep: false,
    });

    stream.on('error', function(err) {
      should.exist(err);
      done(err);
    });

    stream.on('data', function(newFile) {
      should.exist(newFile);
      should.exist(newFile.contents);
    });

    stream.on('end', function() {
      setTimeout(function() {
        should.equal(stringError, true);
        should.equal(iterationError, true);
      }, 500);
    });
    stream.write(srcFile);
    stream.end();
    done();
  });

  it('should error on stream', function(done) {
    const srcFile = new gutil.File({
      path: 'test/fixtures/hello.js',
      cwd: 'test/',
      base: 'test/fixtures',
      contents: fs.createReadStream('test/fixtures/hello.js'),
    });

    const stream = flow({
      beep: false,
    });

    stream.on('error', function(err) {
      should.exist(err);
    });

    stream.on('data', function(newFile) {
      newFile.contents.pipe(es.wait(function(err, data) {
        done(err);
      }));
    });

    stream.write(srcFile);
    stream.end();
    done();
  });

  it('should be able to check with declarations', function(done) {
    assertFile(getFixture('declaration.js'), {
      beep: false,
    }, function() {
      should.equal(moduleError, true);
      moduleError = false;
      assertFile(getFixture('declaration.js'), {
        declarations: './test/fixtures/interfaces',
        beep: false,
      }, function() {
        should.equal(moduleError, false);
      });
    });
    done();
  });

  it('should able to detect broken declarations', function(done) {
    assertFile(getFixture('declaration.js'), {
      beep: false,
    }, function() {
      should.equal(moduleError, true);
      moduleError = false;
      assertFile(getFixture('declaration.js'), {
        declarations: './test/fixtures/broken-interfaces',
        beep: false,
      }, function() {
        should.equal(moduleError, false);
      });
    });
    done();
  });

  it('should kill flow after running', function(done) {
    assertFile(getFixture('declaration.js'), {
      killFlow: true,
      beep: false,
    }, function() {
      execFile(flowBin, ['status', '--no-auto-start'], {
        cwd: 'test',
      }, function(err, stdout, stderr) {
        should.equal(/no flow server running/.test(stderr.toLowerCase()), true);
      });
    });
    done();
  });

  /**
   * Get file from fixtures
   *
   * @param  {string} name fixture file name
   *
   * @return {Vinyl} file object
   */
  function getFixture(name) {
    const _path = '/' + path.relative('/', 'test/fixtures/' + name);
    return new gutil.File({
      path: _path,
      cwd: 'test/',
      base: 'test/fixtures',
      contents: fs.readFileSync(_path),
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
    const stream = flow(flowOptions);
    stream.on('error', function(err) {
      should.exist(err);
      callback(err);
    });

    stream.on('data', function(newFile) {
      should.exist(newFile);
      should.exist(newFile.contents);
    });

    stream.on('end', () => {
      setTimeout(() => {
        callback();
      }, 1000);
    });
    stream.write(srcFile);
    stream.end();
  }
});
