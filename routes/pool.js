var express = require('express');
var router = express.Router();
var stringify = require('json-stringify-safe');
var fs = require('fs');
var mammoth = require('mammoth');
var auth = require('../helpers/auth');
var Subject = require('../models/models').Subject;
var Pool = require('../models/models').Pool;

router.get('/pool/:poolId', auth.isAuthenticated, function(req, res) {
	
	var _poolId = req.params.poolId;

	Pool.findById(_poolId, function (err, pool) {
		
		var poolName = pool.name;
		
		Subject.find({ '_poolId': _poolId }, function (err, subjects) {

			res.render('pool', {
				_poolId: req.params.poolId,
				poolName: poolName,
				subjects: subjects
			});
		});
	});
});

router.get('/subject/:subjectId/remove', auth.isAuthenticated, function (req, res) {
	
	var _subjectId = req.params.subjectId;

	Subject.findByIdAndRemove(_subjectId, function (err, subject) {

		if (err) throw err;

		console.log('removed subject=', subject);

		var _poolId = subject._poolId;

		res.redirect('/pool/' + _poolId);
	});
});

/**
 * Convenience function to update a subject
 */
function updateSubject(_subjectId, update, req, res, customResponse) {

	Subject.update({ _id: _subjectId }, update, function (err, numberAffected, rawResponse) {
					
		if (err) {
			console.error(req.path + ': err=', err);
			res.sendStatus(500);
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
		}

		res.send(subject.file.html);
	});
});

router.post('/subject/:subjectId/update-status', auth.isAuthenticated, function (req, res) {
	
	var _subjectId = req.params.subjectId;

	if (! req.body.status) {
		res.sendStatus(400);
	}

	var update = {
		status: req.body.status
	}
	updateSubject(_subjectId, update, req, res);
});


module.exports = router;
