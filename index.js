var fs = require('fs');
var path = require('path');
var gutil = require("gulp-util");
var through = require("through2");
var flowBin = require('flow-bin');
var exec = require('child_process').exec;
var flowToJshint = require('flow-to-jshint');
var stylish = require('jshint-stylish/stylish').reporter;

var done = {};

function executeFlow(PATH, callback) {
	var command = [
		flowBin,
		'check',
		'/' + path.relative('/', PATH),
		'--json'].join(' ');

	var ignore = false;

	Object.keys(done).forEach(function(key) {
		ignore = ignore || !!path.relative(PATH, key);
	});
	if (ignore) {
		callback && callback();
		return false;
	}

	exec(command, function (err, stdout, stderr) {
		var parsed = JSON.parse(stdout);
		var result = {};
		result.errors = parsed.errors.filter(function(error) {
			error.message = error.message.filter(function(message) {
				return RegExp(PATH).test(message.path);
			});
			return error.message.length > 0;
		});
		if (result.passed) {
			console.log('Passed Flow');
		}
		else if (result.errors.length) {
			stylish(flowToJshint(result));
		}
		callback && callback(result);
	});
}

module.exports = function (param) {
	"use strict";
	function flow(file, enc, callback) {
		if (file.isNull()) {
			this.push(file);
			return callback();
		}
		else if (file.isStream()) {
			this.emit("error",
				new gutil.PluginError("gulp-flow", "Stream content is not supported"));
			return callback();
		}
		else if (file.isBuffer()) {
			var PATH = path.dirname(file.path);

			var configPath = path.join(PATH, '.flowconfig');

			if (fs.existsSync(configPath)) {
				executeFlow(PATH, function(result) {
					if (result) {
						done[PATH] = result;
					}
					callback();
				});
			}
			else {
				fs.writeFile(configPath, '[ignore]\n[include]', function() {
					executeFlow(PATH, function(result) {
						if (result) {
							done[PATH] = result;
						}
						fs.unlink(configPath);
						callback();
					});
				});
			}

			this.push(file);
		}
	}

	return through.obj(flow);
};
