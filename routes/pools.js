var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var auth = require('../helpers/auth');
var Pool = require('../models/models').Pool;
var Subject = require('../models/models').Subject;

router.get('/', auth.isAuthenticated, function (req, res) {
	
	Pool.find({ _userId: req.user._id }, function (err, pools) {

		if (err) throw err;
		
		pools.sort(function (a, b) {

			return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
		});

		res.render('pools', { pools: pools });
	});
});

router.get('/pool/:poolId/remove', auth.isAuthenticated, function (req, res) {

	var _poolId = req.params.poolId;

	Subject.remove({ _poolId: _poolId }, function (err, count) {

		if (err) throw err;

		console.log(req.path + ': removed ' + count + ' subject records');
	});

	Pool.findByIdAndRemove(_poolId, function (err, pool) {

		if (err) throw err;

		console.log(req.path + ': removed pool=', pool);
		res.redirect('/');
	});
});

module.exports = router;