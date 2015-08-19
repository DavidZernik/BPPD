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

router.delete('/delete/confirm', function(req, res){
  User.findOne({_id: req.body.id}, function(err, user){
    if(err) {
      console.log(err);
      res.json({'message': "error: could not delete user"})
      return
    } else {
      console.log(user);
      user.remove();
      res.json({'message': 'deleted user:'+ req.body.id});
      //res.redirect('/')
    };
  });
});

module.exports = router;
