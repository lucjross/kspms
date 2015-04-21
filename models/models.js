var m = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');
var auth = require('../helpers/auth');

var exports = {};

// Subject
var subjectSchema = m.Schema({
	_poolId: {
		type: m.Schema.Types.ObjectId,
		index: true
	},
	lastName: String,
	firstName: String,
	utId: String,
	email: String,
	instructor: {
		lastName: String,
		firstName: String
	},
	courseId: String,
	uniqueId: Number,
	file: {
		originalName: String,
		extension: String,
		html: String
	},
	status: {
		type: String,
		default: 'NE'
	},
	creditsEarned: {
		type: Number,
		default: 0
	},
	comments: {
		type: String,
		default: ''
	},
	isRemoved: {
		type: Boolean,
		default: false
	}
}, { autoIndex: false });
exports.Subject = m.model('Subject', subjectSchema);

// Pool
var poolSchema = m.Schema({
	_userId: {
		type: m.Schema.Types.ObjectId,
		index: true
	},
	name: String
}, { autoIndex: false });
exports.Pool = m.model('Pool', poolSchema);

// User
// var emailSchema = m.Schema({ value: String });
var userSchema = m.Schema({
	name: {
		familyName: String,
		givenName: String
	},
	emails: [
		m.Schema({
			value: {
				type: String,
				lowercase: true
			}
		})
	]
}, { autoIndex: false });
var options = auth.errors || {};
userSchema.plugin(passportLocalMongoose, options);
exports.User = m.model('User', userSchema);


module.exports = exports;








