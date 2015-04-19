var express = require('express');
var router = express.Router();
var auth = require('../helpers/auth');
var Pool = require('../models/models').Pool;
var Subject = require('../models/models').Subject;

router.get('/pool/:poolId/add-subject', auth.isAuthenticated, function (req, res) {

	var _poolId = req.params.poolId;

	Pool.findById(_poolId, function (err, pool) {

		var poolName = pool.name;
		
		var cached = req.app.get('cache-last-subject');
		if (! cached) {
			cached = {};
			cached.instructor = {};
		}

		res.render('add-subject', {
			_poolId: _poolId,
			poolName: poolName,
			lastInstructor_lastName: cached.instructor.lastName || '',
			lastInstructor_firstName: cached.instructor.firstName || '',
			lastCourseId: cached.courseId || '',
			lastUniqueId: cached.uniqueId || ''
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
		instructor: {
			lastName: b.instructor_lastName,
			firstName: b.instructor_firstName
		},
		courseId: b.courseId,
		uniqueId: b.uniqueId,
		status: 'NE'
	};

	req.app.set('cache-last-subject', subjectData);

	Subject.create(subjectData, function (err, subject) {

		if (err) return console.error(err);
		res.status(201).redirect('/pool/' + _poolId);
	});
});

module.exports = router;