var stylish = require('jshint-stylish/stylish').reporter;
var path = require('path');

module.exports = function(result) {
	var errors = result.errors;
	errors.forEach(function(error) {
		error.message.forEach(function(message) {
			message.error = {
				reason: message.descr,
				code: message.code ? 'W' : 'E',
				character: message.start,
				line: message.line
			};
			for (var i in message) {
				error[i] = message[i];
			}
			error.file = path.basename(message.path);
		});
		delete error.message;
	});
	stylish(errors)
};
