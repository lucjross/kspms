var express = require('express');
var router = express.Router();
var auth = require('../helpers/auth');
var Section = require('../models/models').Section;

router.get('/add-section', auth.isAuthenticated, function (req, res) {

	res.render('add-section');
});

router.post('/add-section', auth.isAuthenticated, function (req, res) {

	var sectionData = {
		_userId: req.user._id,
		uniqueId: req.body.uniqueId,
		instructor: {
			lastName: req.body.instructor_lastName,
			firstName: req.body.instructor_firstName
		},
		courseId: req.body.courseId
	};
	Section.create(sectionData, function (err, section) {

		if (err) throw err;

		res.redirect('/sections');
	})
});

module.exports = router;