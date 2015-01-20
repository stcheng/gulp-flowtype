/* @flow weak */
'use strict';
var fs = require('fs');
require('6to5/polyfill');
var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var flowBin = require('flow-bin');
var logSymbols = require('log-symbols');
var stylish = require('jshint-stylish');
var reporter = require(stylish).reporter;
var flowToJshint = require('flow-to-jshint');
var execFile = require('child_process').execFile;

var servers = [];
var passed = true;

/**
 * Wrap critical Flow exception into default Error json format
 */
function fatalError(stderr) {
  return {
    errors: [{
      message: [{
        path: '',
        code: 0,
        line: 0,
        col: 0,
        descr: stderr
      }]
    }]
  };
}

function optsToArgs(opts) {
  var args = [];

  if (opts.all) {
    args.push('--all');
  }
  if (opts.weak) {
    args.push('--weak');
  }
  if (opts.declarations) {
    args.push('--lib', opts.declarations);
  }

  return args;
}

function executeFlow(_path, opts, callback, reject) {
  var flowArgs = optsToArgs(opts);
  var command = flowArgs.length ? (() => {
    servers.push(path.dirname(_path));
    return 'check';
  })() : 'status';
  var args = [
    command,
    '/' + path.relative('/', _path),
    '--json'
  ].concat(flowArgs);

  execFile(flowBin, args, function (err, stdout, stderr) {
    if (stderr && /server launched/.test(stderr)) {
      /**
       * When flow starts a server it gives us an stderr
       * saying the server is starting.
       */
      stderr = null;
    }
    var parsed = !stderr ? JSON.parse(stdout) : fatalError(stderr);
    var result = {};
    result.errors = parsed.errors.filter(function (error) {
      error.message = error.message.filter(function (message, index) {
        var isCurrentFile = message.path === _path;
        var result = false;
        /**
         * If FlowType traces an issue to a method inside a file that is not
         * the one being piped through, it adds a new element to the list
         * of errors with a different file path to the current one. To detect
         * whether this error is related to the current file we check the
         * previous and next error to see if it ends with `found`, `in` or
         * `with`, From this we can tell if the error should be shown or not.
         */
        var lineEnding = /(with|found|in)$/;

        var previous = error.message[index - 1];
        if (previous && lineEnding.test(previous.descr)) {
          result = previous.path === _path;
        }

        var nextMessage = error.message[index + 1];
        if (nextMessage && lineEnding.test(message.descr)) {
          result = nextMessage.path === _path;
        }

        var generalError = (/(Fatal)/.test(message.descr));
        return isCurrentFile || result || generalError;
      });
      return error.message.length > 0;
    });
    if (result.errors.length) {
      passed = false;
      reporter(flowToJshint(result));
      if (args.abort) {
        return reject('Flow failed');
      }
    }
    return callback();
  });
}

module.exports = function (options) {
  var opts = options || {};
  opts.beep = typeof opts.beep !== 'undefined' ? opts.beep : true;

  function Flow(file, enc, callback) {
    if (file.isNull()) {
      this.push(file);
      return callback();
    } else if (file.isStream()) {
      this.emit('error',
        new gutil.PluginError('gulp-flow', 'Stream content is not supported'));
      return callback();
    } else if (file.isBuffer()) {
      var hasPragma = opts.all || /\/(\*+) *@flow *(\*+)\//ig
        .test(fs.readFileSync(file.path).toString());
      if (hasPragma) {
        var flowconfig = path.join(process.cwd(), '.flowconfig');
        if (fs.existsSync(flowconfig)) {
          executeFlow(file.path, opts, callback, err => {
            this.emit('error', new gutil.PluginError('gulp-flow', err));
            return callback();
          });
        } else {
          console.log(logSymbols.warning + ' Missing .flowconfig in the current working directory.');
          this.push(file);
          return callback();
        }
      } else {
        this.push(file);
        return callback();
      }
      this.push(file);
    }
  }

  return through.obj(Flow, function () {
    var end = () => {
      this.emit('end');
    };

    if (passed) {
      console.log(logSymbols.success + ' Flow has found 0 errors');
    } else if (opts.beep) {
      gutil.beep();
    }

    if (opts.killFlow) {
      if (servers.length) {
        servers.forEach(function (path, index) {
          execFile(flowBin, ['stop'], {
            cwd: path
          }, function () {
            if (!servers[index + 1]) {
              end();
            }
          });
        });
      }
      else {
        end();
      }
    } else {
      end();
    }
  });
};
