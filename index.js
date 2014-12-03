/* @flow weak */
'use strict';
var fs = require('fs');
var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var flowBin = require('flow-bin');
var logSymbols = require('log-symbols');
var execFile = require('child_process').execFile;
var flowToJshint = require('flow-to-jshint');
var stylish = require('jshint-stylish');
var reporter = require(stylish).reporter;

var passed = true;

function executeFlow(PATH, flowArgs, callback) {
  var command = flowArgs.length ? 'check' : 'status';
  var args = [
    command,
    '/' + path.relative('/', PATH),
    '--json'
  ].concat(flowArgs);

  execFile(flowBin, args, function (err, stdout) {
    var parsed = JSON.parse(stdout);
    var result = {};
    result.errors = parsed.errors.filter(function (error) {
      error.message = error.message.filter(function (message, index) {
        var isCurrentFile = message.path === PATH;
        var result = false;
        /**
         * If flow finds an issue related to a different file
         * it returns a separate json property along with
         * the different file path. We can check the previous
         * message to see if it ends with `with`, `found` or `in`, if
         * true we know that the next error is related to this one.
         */
        var lineEnding = /(with|found|in)$/;
        var previous = error.message[index - 1];
        if (previous) {
          if (lineEnding.test(previous.descr)) {
            result = previous.path === PATH;
          }
        }
        if (lineEnding.test(message.descr)) {
          var nextMessage = error.message[index + 1];
          if (nextMessage) {
            result = nextMessage.path === PATH;
          }
        }
        return isCurrentFile || result;
      });
      return error.message.length > 0;
    });
    if (result.errors.length) {
      passed = false;
      reporter(flowToJshint(result));
    }
    callback();
  });
}

module.exports = function (options) {
  var opts = options || {};
  var args = [];
  /*jshint -W030 */
  opts.all && args.push('--all');
  opts.weak && args.push('--weak');
  opts.declarations && args.push('--lib') && args.push(opts.declarations);
  function Flow(file, enc, callback) {
    if (file.isNull()) {
      this.push(file);
      return callback();
    }
    else if (file.isStream()) {
      this.emit('error',
        new gutil.PluginError('gulp-flow', 'Stream content is not supported'));
      return callback();
    }
    else if (file.isBuffer()) {
      var hasFlow = opts.all;
      if (!hasFlow) {
        var contents = fs.readFileSync(file.path).toString();
        hasFlow = /\/(\*+) *@flow *(\*+)\//ig.test(contents);
      }
      if (hasFlow) {
        var configPath = path.join(process.cwd(), '.flowconfig');
        if (fs.existsSync(configPath)) {
          executeFlow(file.path, args, callback);
        } else {
          console.log(logSymbols.warning + ' Missing .flowconfig in the current working directory.');
        }
      }
      else {
        this.push(file);
        return callback();
      }
      this.push(file);
    }
  }

  return through.obj(Flow, function () {
    if (passed) {
      console.log(logSymbols.success + ' Flow has found 0 errors');
    }

    if(opts.killFlow) {
      execFile(flowBin, ['stop'], function() {
        this.emit('end');
      }.bind(this));
    } else {
      this.emit('end');
    }

    
  });
};