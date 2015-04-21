var express = require('express');
var router = express.Router();
var stringify = require('json-stringify-safe');
var fs = require('fs');
var csvParse = require('csv-parse');
var mongoose = require('mongoose');
var mongodb = require('mongodb');
var auth = require('../helpers/auth');

var Pool = require('../models/models').Pool;
var Subject = require('../models/models').Subject;

router.get('/pool/:poolId/import-subjects', auth.isAuthenticated, function (req, res) {

	var _poolId = req.params.poolId;

	Pool.findById(_poolId, function (err, pool) {

		if (err) throw err;

		var poolName = pool.name;

		res.render('import-subjects', {
			_poolId: _poolId,
			poolName: poolName
		});
	});
});

router.post('/pool/:poolId/import-subjects', auth.isAuthenticated, function (req, res) {

	var _poolId = req.params.poolId;

	var _unlink = function (path) {

		// delete the temp file
		fs.unlink(path, function (err) {

			if (err) console.error(err);
		});
	};

	if (typeof req.files === 'object' && typeof req.files.file === 'object') {
		var file = req.files.file;

		if (file.extension === 'csv') {
			var output = [];
			var parser = csvParse();
			var path = './uploads/' + file.name;
			var ROW_LENGTH = 8;
			
			parser.on('readable', function () {
				
				var record;
				while (record = parser.read()) {
					if (record.length != ROW_LENGTH) {
						parser.end();
					}

					output.push(record);
				}
			});

			parser.on('error', function (err) {
				
				res.status(500).send({ err: err, message: 'csv-parse error' });
			});

			parser.on('finish', function () {

				if (! output[0] || output[0].length != ROW_LENGTH) {
					res.sendStatus(400);
					return;
				}

				// the first row contains just the unique ID and course description, all within the first column
				var courseRow = output.shift();
				var matches = courseRow[0].match(/^(\d+)\s-\s(.+)/)
				var subjectUniqueId = parseInt(matches[1], 10);
				var subjectCourseId = matches[2];

				// discard headers
				output.shift();

				// last row contains totals (not useful)
				output.pop();

				var subjects = [];
				output.forEach(function (rawSubject) {

					subjects.push({
						// poolId must be wrapped because we're using the mongo API instead of mongoose
						_poolId: mongodb.ObjectID(_poolId),
						lastName: rawSubject[1],
						firstName: rawSubject[0],
						utId: rawSubject[2],
						email: rawSubject[3],
						instructor: {
							lastName: req.body.instructor_lastName,
							firstName: req.body.instructor_firstName
						},
						courseId: subjectCourseId,
						uniqueId: subjectUniqueId,
						// Schema defaults don't apply so making them explicit here
						status: 'NE',
						creditsEarned: 0,
						comments: '',
						isRemoved: false
					});
				});

				Subject.collection.insert(subjects, function (err) {

					if (err) {
						res.status(500).send({ err: err, message: 'mongoose.collection#insert error' });
						return;
					}

					res.redirect('/pool/' + _poolId);
				});
			});

			fs.readFile(path, { encoding: 'utf-8' }, function (err, data) {

				if (err) {
					res.status(500).send({ err: err, message: 'fs#readFile error' });
				}
				else {
					parser.write(data);
					parser.end();
				}

				_unlink(path);
			});
		}
		else {
			res.sendStatus(415);
			_unlink(path);
		}
	}
	else {
		res.sendStatus(400);
	}
});

module.exports = router;