var express = require('express');
var router = express.Router();

var User = require('../models/models').User;
var auth = require('../helpers/auth');

router.get('/new-user', function (req, res) {

	res.render('new-user');
});

router.post('/new-user', function (req, res) {

	req.checkBody('familyName', 'Required').notEmpty();
	req.checkBody('givenName', 'Required').notEmpty();
	req.checkBody('email', 'Invalid e-mail').isEmail();
	req.checkBody('password', 'Required').notEmpty();

	var mappedErrors = req.validationErrors(true);
	if (mappedErrors) {
		if (mappedErrors.password) {
			// get rid of the value to be safe
			mappedErrors.password.value = undefined;
		}

		res.render('new-user', {
			errors: mappedErrors
		});
		return;
	}

	var user = new User({
		username: req.body.username,
		name: {
			familyName: req.body.familyName,
			givenName: req.body.givenName
		},
		emails: [
			{ value: req.body.email }
		]
	});

	User.register(user, req.body.password, function (err, userInserted) {

		mappedErrors = req.validationErrors(true);

		if (err) {
			console.log('err=', err);
			mappedErrors = mappedErrors || {};
			
			if (err.message.indexOf(auth.errors.missingUsernameError) != -1) {
				mappedErrors.username = { msg: auth.errors.missingUsernameError };
			}
			else if (err.message.indexOf(auth.errors.userExistsError) != -1) {
				mappedErrors.username = { msg: auth.errors.userExistsError };
			}
			else if (err.message.indexOf(auth.errors.missingPasswordError) != -1) {
				mappedErrors.password = { msg: auth.errors.missingPasswordError };
			}
			else {
				throw err;
			}
		}

		if (mappedErrors) {
			console.log('mappedErrors=', mappedErrors);
			res.render('new-user', {
				errors: mappedErrors
			});
		}
		else {
			console.log('user registered: ', userInserted);
			res.redirect('/login');
		}
	});
});

module.exports = router;
