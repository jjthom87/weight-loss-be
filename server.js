var express = require('express');
var path = require('path');
var fs = require('fs');
var bodyParser = require('body-parser');
var db = require('./config/db_connection.js');

var app = express();
var dbClient = db.getConnection()
dbClient.connect();

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');
var session = require('express-session');

var PostgreSqlStore = require('connect-pg-simple')(session);
var cookieParser = require('cookie-parser');
var passport = require('passport');
var flash = require('connect-flash');

var PORT = process.env.PORT || 8000;

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(bodyParser.json({ type: 'application/vnd.api+json'}));

app.use(cookieParser());
app.set('trust proxy', 1);
app.use(session({
	secret: "secret",
	resave : true,
	saveUninitialized : false,
	store : new PostgreSqlStore({
		conString: db.retrieveDbUrl()
	})
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user,done){
	done(null, user);
});

passport.deserializeUser(function(obj,done){
	done(null, obj);
});

passport.use('local-signup', new LocalStrategy({
	usernameField: 'username',
	passwordField: 'password',
	passReqToCallback: true
},
function(req, username, password, done){
	process.nextTick(function(){
		dbClient.query("SELECT username FROM users WHERE username='" + username + "'", (err, user) => {
			if(user.rows.length > 0){
				return done(null, false, {message: 'username taken'});
			} else {
				var salt = bcrypt.genSaltSync(10);
				var hashedPassword = bcrypt.hashSync(password, salt);
				var query = "INSERT INTO users (name, username, password) VALUES ($1,$2,$3)";
				dbClient.query(query, [req.body.name, username, hashedPassword], (error,queryRes) => {
					if(error){
						console.error(error)
					} else {
						return done(null, queryRes)
					}
				});
			};
  		});
    });
}));

app.post('/v1/api/register', function(req,res,next){
	passport.authenticate('local-signup', function(err, user, info){
		if (err) {
			return next(err);
		} else {
			res.json({user: user, info: info, statusCode: 200})
		}
	})(req, res, next);
});

passport.use('local-signin', new LocalStrategy({
	usernameField: 'username',
	passwordField: 'password',
	passReqToCallback: true
},
function(req, username, password, done){
	process.nextTick(function(){
		dbClient.query("SELECT * FROM users WHERE username='" + username + "'", (err, user) => {
			if(user.rows.length < 1)
				return done(null, false, {message: 'no user'});
	        if (!bcrypt.compareSync(password, user.rows[0].password)){
	          return done(null, false, {message: 'incorrect password'});
	        }
			return done(null, user.rows[0]);
		});
	});
}));

app.post('/v1/api/login', function(req,res,next){
	passport.authenticate('local-signin', function(err, user, info){
	    if (err) {
	      	return next(err);
	    }
	    if (!user) {
	    	return res.json({ success : false, message : 'authentication failed', info: info });
	    }
	    req.login(user, function(err){
			if(err){
				return next(err);
			}
    	return res.status(200).json({ success : true, message : 'authentication succeeded', object : user });
		});
  	})(req, res, next);
});

app.get('/v1/api/signedin', function(req, res){
  console.log(req.user)
	res.json({user: req.user})
});

app.listen(PORT);
