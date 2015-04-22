var express = require('express');
var router = express.Router();
var auth = require('../helpers/auth');
var Pool = require('../models/models').Pool;
var Subject = require('../models/models').Subject;
var Section = require('../models/models').Section;

router.get('/pool/:poolId/add-subject', auth.isAuthenticated, function (req, res) {

	var _poolId = req.params.poolId;

	Pool.findById(_poolId, function (poolErr, pool) {

		Section.find({
			_userId: req.user._id
			/* , isActive... */
		}, function (sectionErr, sections) {

			sections.sort(function (a, b) {
				return a.uniqueId > b.uniqueId;
			});

			console.log('sections=', sections);

			res.render('add-subject', {
				_poolId: _poolId,
				poolName: pool.name,
				sections: sections
			});
		});
	});
});

router.post('/pool/:poolId/add-subject', auth.isAuthenticated, function (req, res) {

	var _poolId = req.params.poolId;
	var b = req.body;
	var subjectData = {
		_poolId: _poolId,
		lastName: b.lastName,
		firstName: b.firstName,
		utId: b.utId,
		email: b.email,
		_sectionOId: b.sectionOId,
		// instructor: {
		// 	lastName: b.instructor_lastName,
		// 	firstName: b.instructor_firstName
		// },
		// courseId: b.courseId,
		// uniqueId: b.uniqueId
		creditsEarned: b.creditsEarned
	};

	Subject.create(subjectData, function (err, subject) {

		if (err) return console.error(err);
		res.status(201).redirect('/pool/' + _poolId);
	});
});

module.exports = router;