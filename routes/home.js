var express = require('express');
var router = express.Router();
var auth = require('../helpers/auth');

router.get('/', auth.isAuthenticated, function (req, res) {

	res.render('home');
});

module.exports = router;
