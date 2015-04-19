var express = require('express');
var router = express.Router();
var passport = require('passport');

router.get('/login', function (req, res) {

	res.render('login');
});

router.post('/login', function (req, res, next) {

	var authenticate = passport.authenticate('local', function (err, user, info) {

		if (err) {
			console.error('err=', err);
			return next(err);
		}

		if (! user) {
			return res.render('login', { error: info.message });
		}

		req.logIn(user, function (err) {

			if (err) {
				return next(err);
			}

			return res.redirect('/');
		});
	});
	authenticate(req, res, next);
});

module.exports = router;
