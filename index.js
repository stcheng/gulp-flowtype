/* @flow weak */
'use strict';


const Q = require('q');
const fs = require('fs');
const path = require('path');
const gutil = require('gulp-util');
const through = require('through2');
const flowBin = require('flow-bin');
const logSymbols = require('log-symbols');
const childProcess = require('child_process');
//const chalk = require('chalk');
const reporter = require('flow-reporter');

/**
 * Flow check initialises a server per folder when run,
 * we can store these paths and kill them later if need be.
 */
const servers = [];
let passed = true;

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
  const args = [];

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
  const deferred = Q.defer();

  const opts = optsToArgs(options);

  const command = opts.length || options.killFlow ? (() => {
    servers.push(path.dirname(_path));
    return 'check';
  })() : 'status';

  const args = [
    command,
    ...opts,
    '/' + path.relative('/', _path),
    '--json'
  ];

  const stream = childProcess.spawn(getFlowBin(), args);

  let dat = '';
  stream.stdout.on('data', data => {
    dat += data.toString();
  });

  stream.stdout.on('end', () =>{
    let parsed;
    try {
      parsed = JSON.parse(dat);
    }
    catch(e) {
      parsed = fatalError(dat);
    }
    const result = {};

    // loop through errors in file
    result.errors = parsed.errors.filter(function (error) {
      let isCurrentFile = error.message[0].path === _path;
      let generalError = (/(Fatal)/.test(error.message[0].descr));

      return isCurrentFile || generalError;
    });

    if (result.errors.length) {
      passed = false;

      const report = typeof options.reporter === 'undefined' ?
                     reporter : options.reporter;
      report(result.errors);

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
  const deferred = Q.defer();
  const config = path.join(process.cwd(), '.flowconfig');
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
  const deferred = Q.defer();
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
  const defers = servers.map(function (_path) {
    const deferred = Q.defer();
    childProcess.execFile(getFlowBin(), ['stop'], {
      cwd: _path
    }, deferred.resolve);
    return deferred;
  });
  return Q.all(defers);
}

module.exports = function (options={}) {
  options.beep = typeof options.beep !== 'undefined' ? options.beep : true;

  function Flow(file, enc, callback) {

    const _continue = () => {
      this.push(file);
      callback();
    };

    isFileSuitable(file).then(() => {
      const hasPragma = hasJsxPragma(file.contents.toString());
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
    const end = () => {
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
