var fs = require('fs');
var path = require('path');
var gutil = require("gulp-util");
var through = require("through2");
var flowBin = require('flow-bin');
var exec = require('child_process').exec;
var flowToJshint = require('./flow-to-jshint');

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
			error.message = error.message.filter(function(message) {
				return message.path == PATH;
			});
			return error.message.length > 0;
		});
		if (result.passed) {
			console.log('Passed Flow');
		}
		else if (result.errors.length) {
			flowToJshint(result);
		}

		callback && callback();
	});
}

module.exports = function (param) {
	"use strict";

	// see "Writing a plugin"
	// https://github.com/gulpjs/gulp/blob/master/docs/writing-a-plugin/README.md
	function flow(file, enc, callback) {
		/*jshint validthis:true*/

		// Do nothing if no contents
		if (file.isNull()) {
			this.push(file);
			return callback();
		}

		if (file.isStream()) {

			// http://nodejs.org/api/stream.html
			// http://nodejs.org/api/child_process.html
			// https://github.com/dominictarr/event-stream

			// accepting streams is optional
			this.emit("error",
				new gutil.PluginError("gulp-flow", "Stream content is not supported"));
			return callback();
		}

		if (file.isBuffer()) {
			var PATH = path.dirname(file.path);
			var configPath = path.join(PATH, '.flowconfig');
			if (fs.existsSync(configPath)) {
				executeFlow(file.path);
			}
			else {
				fs.writeFile(configPath, '[ignore]\n[include]', function() {
					executeFlow(file.path, function() {
						fs.unlink(configPath);
					});
				});
			}

			this.push(file);

		}
		return callback();
	}

	return through.obj(flow);
};
