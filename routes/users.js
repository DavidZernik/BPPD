var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/* NEW users listing. */
router.get('/new', function(req, res, next) {
  res.render('new.ejs');
});

/* EDIT users info. */
router.get('/edit', function(req, res, next) {
  res.render('edit.ejs');
});

/* DELETE individual user. */
router.get('/delete', function(req, res, next) {
  res.render('../views/delete');
  // res.send('confirm delete page')
});

module.exports = router;
