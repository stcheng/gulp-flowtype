/*global describe, it*/
"use strict";

var fs = require("fs"),
	es = require("event-stream"),
	should = require("should");

require("mocha");

delete require.cache[require.resolve("../")];

var gutil = require("gulp-util"),
	flow = require("../");

var log = console.log;
var matched = false;

console.log = function() {
	for (var i in Array.prototype.slice.call(arguments)) {
		if (/string/.test(arguments[i])) matched = true;
	}
	log.apply(console, arguments);
};

describe("gulp-flow", function () {

	it("should produce expected file via buffer", function (done) {

		var srcFile = new gutil.File({
			path: "test/fixtures/hello.js",
			cwd: "test/",
			base: "test/fixtures",
			contents: fs.readFileSync("test/fixtures/hello.js")
		});

		var stream = flow();

		stream.on("error", function(err) {
			should.exist(err);
			done(err);
		});

		stream.on("data", function (newFile) {
			should.exist(newFile);
			should.exist(newFile.contents);
		});

		stream.on('end', function() {
			setTimeout(function() {
				should.equal(matched, true);
				done();
			}, 200);
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

		stream.on("error", function(err) {
			should.exist(err);
			done();
		});

		stream.on("data", function (newFile) {
			newFile.contents.pipe(es.wait(function(err, data) {
				done(err);
			}));
		});

		stream.write(srcFile);
		stream.end();
	});

});
