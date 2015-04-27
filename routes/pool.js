var express = require('express');
var router = express.Router();
var stringify = require('json-stringify-safe');
var fs = require('fs');
var mammoth = require('mammoth');
var auth = require('../helpers/auth');
var Subject = require('../models/models').Subject;
var Pool = require('../models/models').Pool;
var Section = require('../models/models').Section;
var statusPaths = require('../helpers/statusPaths');

router.get('/statusPaths', function (req, res) {
	res.send(statusPaths)
});

router.get('/pool/:poolId', auth.isAuthenticated, function(req, res) {
	
	var _poolId = req.params.poolId;

	Pool.findById(_poolId, function (err, pool) {
		
		var subjectConditions = {
			'_poolId': _poolId
		};
		var sectionConditions = {};
		var q = req.query;
		if (q !== {}) {
			if (/^[a-z ,.'-]{1,50}$/i.test(q.instructorLastName)) {
				// contains
				sectionConditions['instructor.lastName'] = new RegExp(q.instructorLastName, 'gi');
			}
			else delete q.instructorLastName;

			if (/^\d{1,10}$/.test(q.uniqueID)) {
				// equals
				var uniqueID = parseInt(q.uniqueID, 10);
				sectionConditions['uniqueID'] = uniqueID;
			}
			else delete q.uniqueID;

			if (/^[A-Z]{1,2}$/.test(q.status)) {
				// equals
				subjectConditions['status'] = q.status;
			}
			else delete q.status;

			if (! q.showRemoved) {
				subjectConditions['isRemoved'] = false;
			}
		}

		Section.find(sectionConditions, function (err, sections) {

			if (sectionConditions !== {}) {
				var sectionOIds = sections.map(function (s) {
					return s._id;
				});

				subjectConditions['_sectionOId'] = { $in: sectionOIds };
			}

			Subject.find(subjectConditions, function (err, subjects) {

				var sectionsBySubjectOId = {};
				subjects.forEach(function (subject) {
					sections.every(function (section) {
						if (section._id.equals(subject._sectionOId)) {
							sectionsBySubjectOId[subject._id] = section;
							return false;
						}
						return true;
					});
				});
				
				res.render('pool', {
					_poolId: req.params.poolId,
					poolName: pool.name,
					subjects: subjects,
					sectionsBySubjectOId: sectionsBySubjectOId,
					query: q,
					statusPaths: statusPaths
				});
			});
		});
	});
});

router.post(/^\/subject\/([0-9a-z]+)\/(un)?remove$/, auth.isAuthenticated, function (req, res) {

	var _subjectId = req.params[0];
	var remove = ! req.params[1]; // "un" isn't there
	var update = {
		isRemoved: remove
	};

	updateSubject(_subjectId, update, req, res);
});

/**
 * Convenience function to update a subject
 */
function updateSubject(_subjectId, update, req, res, customResponse) {

	Subject.update({ _id: _subjectId }, update, function (err, numberAffected, rawResponse) {
					
		if (err) {
			console.error(req.path + ': err=', err);
			res.sendStatus(500);
			return;
		}

		res.status(200).send(customResponse);
	});
}

router.post('/subject/:subjectId/update-file', auth.isAuthenticated, function (req, res) {
	
	var _subjectId = req.params.subjectId;

	var unlink = function (path) {
		// delete the temp file
		fs.unlink(path, function (err) {

			if (err) console.error('fs#unlink error: ', err);
		});
	};

	if (typeof req.files === 'object' && req.files[0]) {

		var file = req.files[0];
		if (file.extension === 'docx') {

			var options = {
				convertImage: mammoth.images.inline(function (el) {
					return { src: '' };
				})
			}
			var path = './uploads/' + file.name;
			mammoth.convertToHtml({ path: path }, options)
			.then(function (result) {

				var update = {
					file: {
						originalName: file.originalname,
						extension: file.extension,
						html: result.value
					}
				};
				updateSubject(_subjectId, update, req, res, { originalName: file.originalname });
			})
			.catch(function (e) {

				console.error('mammoth#convertToHtml error: ', e);
				res.sendStatus(500);
			})
			.finally(function () {

				unlink(path);
			});
		}
		else {
			res.sendStatus(415);
			unlink(path);
		}
	}
	else {
		res.sendStatus(400);
	}
});

router.get('/subject/:subjectId/view-file', auth.isAuthenticated, function (req, res) {

	var _subjectId = req.params.subjectId;

	Subject.findById(_subjectId, function (err, subject) {

		if (err) {
			console.error(err);
			res.sendStatus(404);
			return;
		}

		res.send(subject.file.html);
	});
});

router.post('/subject/:subjectId/update-status', auth.isAuthenticated, function (req, res) {
	
	var _subjectId = req.params.subjectId;

	if (! /^[A-Z]{1,2}$/.test(req.body.status)) {
		res.sendStatus(400);
		return;
	}

	var update = {
		status: req.body.status
	}
	updateSubject(_subjectId, update, req, res);
});

router.post('/subject/:subjectId/update-comments', auth.isAuthenticated, function (req, res) {

	var _subjectId = req.params.subjectId;

	if (typeof req.body.comments !== 'string') {
		res.sendStatus(400);
		return;
	}

	var update = {
		comments: req.body.comments
	}
	updateSubject(_subjectId, update, req, res);
});


module.exports = router;
