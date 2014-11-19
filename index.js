var through = require("through2"),
	gutil = require("gulp-util"),
	exec = require('child_process').exec,
	path = require('path'),
	flowBin = require('flow-bin'),
	flowToJshint = require('./flow-to-jshint');
var fs = require('fs');

function executeFlow(PATH, callback) {
	exec([flowBin, 'check', '/' + path.relative('/', PATH), '--json'].join(' '), function (err, stdout, stderr) {
		if (callback) callback();
		var result = JSON.parse(stdout);
		if (result.passed) {
			console.log('Passed Flow');
			return;
		}
		flowToJshint(result);
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
				executeFlow(PATH);
			}
			else {
				fs.writeFile(configPath, '[ignore]\n[include]', function() {
					executeFlow(PATH, function() {
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
