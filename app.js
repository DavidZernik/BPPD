//=====BASE SETUP=====
//Call our packages
var express = require('express');
var path = require('path');
//
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose'); //creating a schema in mongo
var morgan = require('morgan'); //used to see the requests in console
// var dotenv = require('dotenv').load(); // used to load environment variables for api keys
var sc = require('node-soundcloud'); // soundcloud api package
var bcrypt = require('bcrypt'); //encrypting your passwords
var jwt = require('jsonwebtoken'); //create and verify tokens
var ejsLayouts = require("express-ejs-layouts"); //to create view partials

var routes = require('./routes/index');
var users = require('./routes/users');
//Database connection
// mongoose.connect('mongodb://localhost/bppd'); //database connection string for dev
mongoose.connect('mongodb://bendavis:bendavis@ds035593.mongolab.com:35593/bppd'); //database connection string
var User = require('./models/user');

//=====APP CONFIG=====
var app = express();
var apiRouter = express.Router();

//=====INITIALIZE SOUNDCLOUD API WITH KEYS IN .env FILE
sc.init({
  id: process.env.SOUNDCLOUD_CLIENT_ID,
  secret: process.env.SOUNDCLOUD_CLIENT_SECRET,
  uri: 'http://0.0.0.0:8080'
});
//====================

//use morgan to show requests
app.use(morgan('dev'));
//use body-parser so we can grab info from params.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//create token signature
var secret = 'carlito';

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(ejsLayouts);

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// this will use express's static
app.use(express.static(path.join(__dirname, 'public')));

//=====Token Check=====
app.use(function(req, res, next){
  //checks for token in various locations
  var token = req.cookies.token || req.body.token || req.param('token') || req.headers['x-access-token'];
  //decode the token
  if(token){
    //verify secret and check expiration
    jwt.verify(token, secret, function(err, decoded){
      if(err) console.log('Access denied');//res.status(403).send({success: false, message: "Access Denied!"})
      req.token = token;
      req.decoded = decoded;
      next();
    })
  }else{
    console.log('Not authorized')
    req.token = false;
    req.decoded = false;
    next();
    // return res.status(403).send({success: false, message: "Not token provided"});
  }
  //console.log(token);
});

app.use('/', routes);
app.use('/users', users);

//=====REGISTER ROUTES
//Allows to be part of your express app
app.use('/api', apiRouter);
//====================

app.post('/signin',function(req, res){
  var userParams = req.body;
  console.log( "user to find" + userParams);
  User.findOne({email: userParams.email
  }).select('name email password songs').exec(function(err, user){
    // if(err) throw err;
    // console.log(user + 'app.post');
    //no user with that username was found
    if(!user){
      res.json({success: false, message: "Authentication failed"});
    }else if(user){
      var validPassword = user.authenticate(userParams.password);
      if(!validPassword){
        res.json({success: false, message: "Wrong Password"});
      }else{
        var token = jwt.sign({
          //creating token payload
          id: user._id
          // name: user.name,
          // email: user.email,
          // songs: user.songs
        },
          secret,
        { expireInMinutes: 1440 //expires in 24 hrs
        });
        //if user is found
        res.cookie("token", token);
        // res.json({success: true, message: "Here is your token", token: token});
        res.redirect('/');
      }
    }
  })
});

/* NEW users listing. */
app.get('/new/account', function(req, res, next) {
  res.render('new', {title: 'Create New Account', token: req.token, });
});

app.get('/logout', function(req,res){
  var userParams = req.decoded.id;
  console.log('User Trying to log out:', userParams);
  res.clearCookie('token');
  res.redirect('/');
});

app.get('/:songId', function(req,res) {
  res.render('index', { title: 'stratus', token: req.decoded, radioId: req.params.songId })
});

//=====API ROUTES=====
//New and Show all users
apiRouter.route('/users')
  .post(function(req, res){
    //create a new instance of the user model
    var user = new User(req.body);

    //save the user and encrypt the pw
    user.save(function(err){
      if(err){
        return res.status(401).send({message: err.errmsg});
      }else{
        console.log(user);
        return res.status(200).send({message: 'user created!'});
      };
    });
  })
  .get(function(req, res){
    var token = req.cookies.token;

    User.find({}, function(err, users){
      if(err) return res.status(401).send({message: err.errmsg});
      res.json(users);
      console.log(token);
    });
  });

  //Show, update, and delete User
  apiRouter.route('/users/:id')
    .get(function(req, res){
      User.findOne({_id: req.params.id}, function(err, user){
        if(err) res.json({message: "Error: Could not find user"});
        res.json(user);
      });
    })
    .patch(function(req, res){
      User.findOneAndUpdate({_id: req.params.id}, req.body.user, function(err, user){
        if(err) res.json({message: "Error: Could not update"})
        res.json(user);
      });
    })
    .delete(function(req, res){
      User.findOneAndRemove({_id: req.params.id}, function(err, user){
        if(err) res.json({message: "Error: Could not delete"})
        res.json({message: "User was deleted"})
      });
    });

  //TEST SOUNDCLOUD API REQUESTS:
  apiRouter.route('/search')
    .get(function(req,res){
      var response = {};
      sc.get('/tracks', {q: req.query.searchString}, function(err, results) {
        if( err ) {
          throw err;
        } else {
          response.songs = [];
          //var songs = [];
          for(var i = 0; i < results.length; i += 1) {
            response.songs.push(results[i].id);
          }

          if(req.token){
            console.log('logged in user is searching');
            response.userIsLoggedIn = true;
            User.findOne({_id: req.decoded.id}, function(err, user){
              if(err) return console.log(err);
              response.likedSongs = user.songs;
              res.json(response);
            })
          } else {
            console.log('user searching is NOT logged in');
            response.userIsLoggedIn = false;
            res.json(response);
          }
           //return just song titles from url params search:
          //console.log(results); //return complete result objects
          //res.json(results);
        }
      })


    });

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err,
      token: req.token,
      title: 'error'
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {},
    token: req.token,
    title: 'error'
  });
});


module.exports = app;
