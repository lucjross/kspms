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
var Section = require('../models/models').Section;

router.get('/pool/:poolId/import-subjects', auth.isAuthenticated, function (req, res) {

	var _poolId = req.params.poolId;

	Pool.findById(_poolId, 'name', function (poolErr, pool) {

		if (poolErr) throw poolErr;

		res.render('import-subjects', {
			_poolId: _poolId,
			poolName: pool.name
		});

		// temp import data shouldn't be needed at this point
		req.app.locals.getUserTemp(req, 'mostRecentCSVParse', undefined);
	});
});

router.post('/pool/:poolId/import-subjects', auth.isAuthenticated, function (req, res) {

	var poolId = req.params.poolId;

	var _unlink = function (path) {

		// delete the temp file
		fs.unlink(path, function (err) {

			if (err) console.error(err);
		});
	};

	var mostRecentCSVParse = req.app.locals.getUserTemp(req, 'mostRecentCSVParse') // is set after parsing
	console.log('req.files=', req.files);
	console.log('mostRecentCSVParse=', mostRecentCSVParse);

	if (typeof req.files === 'object' && typeof req.files.file === 'object') {
		// is initial upload

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
				// var matches = output[0].match(/^(\d+)\s-\s(.+)/);
				var sectionRow = output.shift();
				var sectionRowMatches = sectionRow[0].match(/^(\d+)\s-\s(.+)/);
				var uniqueId = parseInt(sectionRowMatches[1], 10);
				var course = sectionRowMatches[2];

				// discard headers
				output.shift();

				// last row contains totals (not useful)
				output.pop();

				// now see if the unique ID matches any existing Sections
				// (have to get the pool again first since this is an operation on a pool)
				Pool.findById(poolId, 'name', function (poolErr, pool) {

					if (poolErr) throw poolErr;

					Section.findOne({
						_userId: req.user._id,
						uniqueId: uniqueId
					}, function (sectionErr, section) {

						console.log('section=', section);

						if (sectionErr) throw sectionErr;

						if (section == null || section.uniqueId !== uniqueId) {
							// save CSV parser output to userTemp,
							// then reload page with relevant prompts

							var partialSection = {
								uniqueId: uniqueId,
								course: course
							}
							req.app.locals.setUserTemp(req, 'mostRecentCSVParse', {
								cleanedOutput: output,
								partialSection: partialSection
							});

							res.render('import-subjects', {
								_poolId: poolId,
								poolName: pool.name,
								partialSection: partialSection
							});
						}
						else {
							// Section exists, so ask user to confirm import

							req.app.locals.setUserTemp(req, 'mostRecentCSVParse', {
								cleanedOutput: output,
								existingSection: section
							});

							res.render('import-subjects', {
								_poolId: poolId,
								poolName: pool.name,
								existingSection: section
							});
						}
					});
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
	else if (mostRecentCSVParse) {
		// remove the temp data from memory
		req.app.locals.setUserTemp(req, 'mostRecentCSVParse', undefined);

		var _insertSubjects = function (sectionOIdStr) {

			var subjects = [];
			mostRecentCSVParse.cleanedOutput.forEach(function (csvSubject) {

				subjects.push({
					// OIDs must be wrapped because we're using the mongo API instead of mongoose
					_poolId: mongodb.ObjectID(poolId),
					lastName: csvSubject[1],
					firstName: csvSubject[0],
					utId: csvSubject[2],
					email: csvSubject[3],
					_sectionOId: mongodb.ObjectID(sectionOIdStr),
					// Schema defaults don't apply so making them explicit here
					status: 'NE',
					creditsEarned: 0,
					comments: '',
					isRemoved: false
				});
			});

			console.log('POJSO subjects=', subjects);

			Subject.collection.insert(subjects, function (err) {

				if (err) {
					res.status(500).send({ err: err, message: 'mongoose.collection#insert error' });
					return;
				}

				res.redirect('/pool/' + poolId);
			});
		};

		if (mostRecentCSVParse.existingSection) {
			// Section already existed

			_insertSubjects(mostRecentCSVParse.existingSection._id.toString());
		}
		else if (mostRecentCSVParse.partialSection) {
			// User had to enter an instructor name for a new Section

			var sectionData = {
				_userId: req.user._id,
				uniqueId: mostRecentCSVParse.partialSection.uniqueId,
				instructor: {
					lastName: req.body.instructor_lastName,
					firstName: req.body.instructor_firstName
				},
				course: mostRecentCSVParse.partialSection.course
			};
			Section.create(sectionData, function (err, section) {

				if (err) throw err;

				_insertSubjects(section._id.toString());
			});
		}
		else {
			// ???
			res.status(500).send({ mostRecentCSVParse: mostRecentCSVParse });
		}
	}
	else {
		res.sendStatus(400);
	}
});

module.exports = router;