var express = require('express');
var router = express.Router();
var auth = require('../helpers/auth');
var Section = require('../models/models').Section;
var Subject = require('../models/models').Subject;

router.get('/sections', auth.isAuthenticated, function (req, res) {
	
	Section.find({ _userId: req.user._id }, function (err, sections) {

		if (err) throw err;
		
		sections.sort(function (a, b) {

			return a.uniqueId > b.uniqueId;
		});

		res.render('sections', { sections: sections });
	});
});

router.get('/section/:sectionOId/remove', auth.isAuthenticated, function (req, res) {

	var sectionOId = req.params.sectionOId;

	Subject.remove({ _sectionOId: sectionOId }, function (err, count) {

		if (err) throw err;

		console.log(req.path + ': removed ' + count + ' subject records');
	});

	Section.findByIdAndRemove(sectionOId, function (err, section) {

		if (err) throw err;

		console.log(req.path + ': removed section=', section);
		res.redirect('/sections');
	});
});

module.exports = router;
