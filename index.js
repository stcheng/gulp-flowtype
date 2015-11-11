/* @flow weak */
'use strict';
var Q = require('q');
var fs = require('fs');
require('babel/polyfill');
var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var flowBin = require('flow-bin');
var logSymbols = require('log-symbols');
var { execFile, spawn } = require('child_process');
var flowToJshint = require('flow-to-jshint');
var stylishReporter = require(require('jshint-stylish')).reporter;

/**
 * Flow check initialises a server per folder when run,
 * we can store these paths and kill them later if need be.
 */
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
        start: 0,
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

function getFlowBin() {
    return process.env.FLOW_BIN || flowBin;
}

function executeFlow(_path, options) {
  var deferred = Q.defer();

  var opts = optsToArgs(options);

  var command = opts.length ? (() => {
    servers.push(path.dirname(_path));
    return 'check';
  })() : 'status';

  var args = [
    command,
    ...opts,
    '/' + path.relative('/', _path),
    '--json'
  ];

  var stream = spawn(getFlowBin(), args);

  stream.stdout.on('data', data => {
    var parsed;
    try {
      parsed = JSON.parse(data.toString());
    }
    catch(e) {
      parsed = fatalError(data.toString());
    }
    var result = {};
    result.errors = parsed.errors.filter(function (error) {
      if (!error.message.some(function (msg) { return msg.path === _path; })) {
        return false;
      }
      var message = [];
      for (var i = 0; i < error.message.length; i++) {
        var msg = error.message[i];
        // A lot of Flow errors have 2-3 messages, where the first one
        // indicates the place and identifier that cause the problem,
        // and the 2nd one contains the error message. An optional third
        // message might contain a place and identifier that the first
        // one is in conflict with. Here we fold first and second
        // message into one to make the reporting more concise.
        if (i > 0 && !msg.path && !msg.line) {
          error.message[i - 1].descr += '\n' + msg.descr;
        } else {
          message.push(msg);
        }
      }
      error.message = message;
      return true;
    });

    if (result.errors.length) {
      passed = false;

      var reporter = typeof options.reporter === 'undefined' ?
        stylishReporter : options.reporter.reporter;

      reporter(flowToJshint(result));

      if (options.abort) {
        deferred.reject(new gutil.PluginError('gulp-flow', 'Flow failed'));
      }
      else {
        deferred.resolve();
      }
    }
    else {
      deferred.resolve();
    }
  });

  return deferred.promise;
}

function checkFlowConfigExist() {
  var deferred = Q.defer();
  var config = path.join(process.cwd(), '.flowconfig');
  fs.exists(config, function(exists) {
    if (exists) {
      deferred.resolve();
    }
    else {
      deferred.reject('Missing .flowconfig in the current working directory.');
    }
  });
  return deferred.promise;
}

function hasJsxPragma(contents) {
  return /@flow\b/ig
    .test(contents);
}

function isFileSuitable(file) {
  var deferred = Q.defer();
  if (file.isNull()) {
    deferred.reject();
  }
  else if (file.isStream()) {
    deferred.reject(new gutil.PluginError('gulp-flow', 'Stream content is not supported'));
  }
  else if (file.isBuffer()) {
    deferred.resolve();
  }
  else {
    deferred.reject();
  }
  return deferred.promise;
}

function killServers() {
  var defers = servers.map(function(_path) {
    var deferred = Q.defer();
    execFile(getFlowBin(), ['stop'], {
      cwd: _path
    }, deferred.resolve);
    return deferred;
  });
  return Q.all(defers);
}

module.exports = function (options={}) {
  options.beep = typeof options.beep !== 'undefined' ? options.beep : true;

  function Flow(file, enc, callback) {

    var _continue = () => {
      this.push(file);
      callback();
    };

    isFileSuitable(file).then(() => {
      var hasPragma = hasJsxPragma(file.contents.toString());
      if (options.all || hasPragma) {
        checkFlowConfigExist().then(() => {
          executeFlow(file.path, options).then(_continue, err => {
            this.emit('error', err);
            callback();
          });
        }, msg => {
          console.log(logSymbols.warning + ' ' + msg);
          _continue();
        });
      } else {
        _continue();
      }
    }, err => {
      if (err) {
        this.emit('error', err);
      }
      callback();
    });
  }

  return through.obj(Flow, function () {
    var end = () => {
      this.emit('end');
      passed = true;
    };

    if (passed) {
      console.log(logSymbols.success + ' Flow has found 0 errors');
    } else if (options.beep) {
      gutil.beep();
    }

    if (options.killFlow) {
      if (servers.length) {
        killServers().done(end);
      }
      else {
        end();
      }
    } else {
      end();
    }
  });
};
