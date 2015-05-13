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

var _rerender = function (req, res, csvErrMsg) {

	var poolInfo = req.app.locals.getUserTemp(req, 'import-poolInfo');
	res.render('import-subjects', {
		_poolId: poolInfo._poolId,
		poolName: poolInfo.poolName,
		csvNope: csvErrMsg
	});
};

router.get('/pool/:poolId/import-subjects', auth.isAuthenticated, function (req, res) {

	var poolId = req.params.poolId;

	Pool.findById(poolId, 'name', function (poolErr, pool) {

		if (poolErr) throw poolErr;

		// i guess i can't make a 'poolInfo' var to share between this and the res#render call
		// because res#render modifies the object
		req.app.locals.setUserTemp(req, 'import-poolInfo', {
			_poolId: poolId,
			poolName: pool.name
		});
		console.log('get import-poolInfo = ', req.app.locals.getUserTemp(req, 'import-poolInfo'));

		// temp import data shouldn't be needed at this point
		req.app.locals.setUserTemp(req, 'mostRecentCSVParse', undefined);

		// saving the session explicitly is a work-around due to an express-session bug
		req.session.save(function (err) {
			if (err) return next(err);

			res.render('import-subjects', {
				_poolId: poolId,
				poolName: pool.name
			});
		});
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

	var mostRecentCSVParse = req.app.locals.getUserTemp(req, 'mostRecentCSVParse'); // is set after parsing

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
				
				_rerender(req, res,
						'failed to parse');
			});

			parser.on('finish', function () {

				/*
				 * PARSING AND VALIDATIONS
				 */

				if (! output[0] || output[0].length != ROW_LENGTH) {
					_rerender(req, res,
							'incorrect row length');
					return;
				}

				// the first row contains just the unique ID and course description, all within the first column
				// var matches = output[0].match(/^(\d+)\s-\s(.+)/);
				var sectionRow = output.shift();
				var sectionRowMatches = sectionRow[0].match(/^(\d+)\s-\s(.+)/); // TODO: this might return something bad
				
				if (! Array.isArray(sectionRowMatches)) {
					_rerender(req, res,
							'header does not contain valid section info');
					return;
				}

				var uniqueID = parseInt(sectionRowMatches[1], 10);
				var course = sectionRowMatches[2];
				if (! (uniqueID != NaN && uniqueID > 0 &&
						typeof course === 'string' && course.length > 0)) {
					_rerender(req, res,
							'header does not contain valid section info');
					return;
				}

				// discard column headers
				output.shift();

				// last row contains totals (not useful)
				output.pop();

				if (output.length === 0) {
					_rerender(req, res,
							'found zero rows of subject data');
				}

				// make sure all the Subject rows are valid
				for (var i = 0; i < output.length; i++) {
					if (output[i].length !== ROW_LENGTH) {
						_rerender(req, res,
								'subject row at index ' + i + ' has incorrect length');
						return;
					}
				}
				// done with validation



				// now see if the unique ID matches any existing Sections
				Section.findOne({
					_userId: req.user._id,
					uniqueID: uniqueID
				}, function (sectionErr, section) {

					if (sectionErr) throw sectionErr;

					var poolInfo = req.app.locals.getUserTemp(req, 'import-poolInfo');

					if (section == null || section.uniqueID !== uniqueID) {
						// save CSV parser output to userTemp,
						// then reload page with relevant prompts

						var partialSection = {
							uniqueID: uniqueID,
							course: course
						}
						req.app.locals.setUserTemp(req, 'mostRecentCSVParse', {
							cleanedOutput: output,
							partialSection: partialSection
						});

						res.render('import-subjects', {
							_poolId: poolInfo._poolId,
							poolName: poolInfo.poolName,
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
							_poolId: poolInfo._poolId,
							poolName: poolInfo.poolName,
							existingSection: section
						});
					}
				});
			});

			// the above parser events are triggered here
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
			_rerender(req, res,
						'incorrect file format');
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
					lastName: csvSubject[1],			// Last Name
					firstName: csvSubject[0],			// First Name
					utId: csvSubject[2], 				// Student ID #
					email: csvSubject[3],				// Email
					_sectionOId: mongodb.ObjectID(sectionOIdStr),
					// Schema defaults don't apply so making them explicit here
					status: 'NE',
					creditsEarned: parseFloat(csvSubject[5]),			// Credits Earned
					creditsRequired: parseFloat(csvSubject[6]),			// Credits Required
					overallUnexcusedNoShows: parseInt(csvSubject[7]),	// Overall Unexcused No-Shows
					comments: '',
					isRemoved: false
				});
			});

			Subject.collection.insert(subjects, function (err) {

				if (err) {
					res.status(500).send({
						err: err,
						message: 'mongoose.collection#insert error'
					});
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
				uniqueID: mostRecentCSVParse.partialSection.uniqueID,
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