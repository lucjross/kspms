

module.exports = {
	isAuthenticated: function (req, res, next) {
		if (req.isAuthenticated()) {
			return next();
		}
		res.redirect('/login');
	},

	/* passport-local-mongoose */
	errors: {
		missingUsernameError: 'Required',
		missingPasswordError: 'Required',
		userExistsError: 'User already exists'
	}
	
};