'use strict';

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const https = require('https');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const User = require('./models/user');
const TOKEN_KEY = process.env.TOKEN_KEY;

exports.local = passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

exports.getToken = user => {
  return jwt.sign(user, TOKEN_KEY, {expiresIn: '30d'});
};

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = TOKEN_KEY;

exports.jwtPassport = passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
  console.log("JWT payload", jwt_payload);
  User.findOne({_id: jwt_payload._id}, (err, user) => {
    if (err) {
      return done(err, false);
    } else if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  });
}));

exports.verifyUser = passport.authenticate('jwt', {session: false});

exports.verifyAdmin = (req, res, next) => {
  if (req.user.admin || req.user.system) {
    next();
  } else {
    const err = new Error("Unauthorized");
    err.status = 403;
    return next(err);
  }
};
