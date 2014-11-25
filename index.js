var fs = require('fs');
var path = require('path');
var gutil = require("gulp-util");
var through = require("through2");
var flowBin = require('flow-bin');
var logSymbols = require('log-symbols');
var exec = require('child_process').exec;
var flowToJshint = require('flow-to-jshint');
var stylish = require('jshint-stylish/stylish').reporter;

var passed = true;

function executeFlow(PATH, callback) {
	var command = [
		flowBin,
		'check',
		'/' + path.relative('/', PATH),
		'--json'].join(' ');

	exec(command, function (err, stdout, stderr) {
		var parsed = JSON.parse(stdout);
		var result = {};
		result.errors = parsed.errors.filter(function(error) {
			error.message = error.message.filter(function(message, index) {
				var isCurrentFile = message.path == PATH;
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
						result = previous.path == PATH;
					}
				}
				if (lineEnding.test(message.descr)) {
					var nextMessage = error.message[index + 1];
					if (nextMessage) {
						result = nextMessage.path == PATH;
					}
				}
				return isCurrentFile || result;
			});
			return error.message.length > 0;
		});
		if (result.errors.length) {
			passed = false;
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

			var contents = fs.readFileSync(file.path).toString();
			var hasFlow = /\/(\*+) *@flow *(\*+)\//ig.test(contents);
			if (hasFlow) {
				var configPath = path.join(PATH, '.flowconfig');
				if (fs.existsSync(configPath)) {
					executeFlow(file.path, function(result) {
						callback();
					});
				} else {
					fs.writeFile(configPath, '[ignore]\n[include]', function() {
						executeFlow(file.path, function(result) {
							fs.unlinkSync(configPath);
							callback();
						});
					});
				}
			}
			else {
				this.push(file);
				return callback();
			}
			this.push(file);
		}
	}

	return through.obj(flow, function() {
		if (passed) {
			console.log(logSymbols.success + ' Flow has found 0 errors');
		}
		this.emit('end');
	});
};
