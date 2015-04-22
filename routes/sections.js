var express = require('express');
var router = express.Router();
var auth = require('../helpers/auth');
var Section = require('../models/models').Section;

router.get('/sections', auth.isAuthenticated, function (req, res) {
	
	Section.find({ _userId: req.user._id }, function (err, sections) {

		if (err) throw err;
		
		sections.sort(function (a, b) {

			return a.uniqueId > b.uniqueId;
		});

		res.render('sections', { sections: sections });
	});
});

module.exports = router;
