var express = require('express');
var router = express.Router();
var auth = require('../helpers/auth');
var Pool = require('../models/models').Pool;

router.get('/add-pool', auth.isAuthenticated, function (req, res) {

	res.render('add-pool');
});

router.post('/add-pool', auth.isAuthenticated, function (req, res) {

	var poolData = {
		_userId: req.user._id,
		name: req.body.name
	};
	Pool.create(poolData, function (err, pool) {

		if (err) throw err;

		res.redirect('/pool/' + pool._id);
	})
});

module.exports = router;