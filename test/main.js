/* @flow */
/*global describe, it*/
"use strict";

var fs = require("fs"),
  es = require("event-stream"),
  should = require("should");
var path = require('path');

require("mocha");

delete require.cache[require.resolve("../")];

var gutil = require("gulp-util"),
  flow = require("../");

var log = console.log;
var stringError = false;
var iterationError = false;
var moduleError = false;

console.log = function () {
  Array.prototype.slice.call(arguments).forEach(function (arg) {
    if (/string/.test(arg)) stringError = true;
    if (/iteration/.test(arg)) iterationError = true;
    if (/Required/.test(arg)) moduleError = true;
  });
  log.apply(console, arguments);
};

describe("gulp-flow", function () {
  this.timeout(5000);

  it("should produce expected file via buffer", function (done) {

    var srcFile = getFixture('hello.js');

    var stream = flow();

    stream.on("error", function (err) {
      should.exist(err);
      done(err);
    });

    stream.on("data", function (newFile) {
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

  it("should error on stream", function (done) {

    var srcFile = new gutil.File({
      path: "test/fixtures/hello.js",
      cwd: "test/",
      base: "test/fixtures",
      contents: fs.createReadStream("test/fixtures/hello.js")
    });

    var stream = flow();

    stream.on("error", function (err) {
      should.exist(err);
      done();
    });

    stream.on("data", function (newFile) {
      newFile.contents.pipe(es.wait(function (err, data) {
        done(err);
      }));
    });

    stream.write(srcFile);
    stream.end();
  });

  it("should able to check with declarations", function (done) {
    assertFile(getFixture('declaration.js'), {}, function () {
      should.equal(moduleError, true);
      moduleError = false;
      assertFile(getFixture('declaration.js'), {
        declarations: './test/fixtures/interfaces'
      }, function () {
        should.equal(moduleError, false);
        done();
      });
    });

  });

  function getFixture(name) {
    var _path = '/' + path.relative('/', 'test/fixtures/' + name);
    return new gutil.File({
      path: _path,
      cwd: "test/",
      base: "test/fixtures",
      contents: fs.readFileSync(_path)
    });
  }

  function assertFile(srcFile, flowOptions, callback) {
    var stream = flow(flowOptions);
    stream.on("error", function (err) {
      should.exist(err);
      callback(err);
    });

    stream.on("data", function (newFile) {
      should.exist(newFile);
      should.exist(newFile.contents);
    });

    stream.on('end', function () {
      setTimeout(function () {
        callback();
      }, 500);
    });
    stream.write(srcFile);
    stream.end();
  }

});
