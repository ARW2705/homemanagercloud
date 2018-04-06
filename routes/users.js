'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');

const User = require('../models/user');
const authenticate = require('../authenticate');

const userRouter = express.Router();

userRouter.use(bodyParser.json());

userRouter.route('/checkJWTToken')
  .get((req, res) => {
    passport.authenticate('jwt', {session: false}, (err, user, data) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        return res.json({status: 'JWT invalid', success: false, err: data});
      } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.json({status: 'JWT valid', success: true, user: user});
      }
    })(req, res);
  });

userRouter.route('/signup')
  .post((req, res, next) => {
    console.log('signup');
    User.register(new User({username: req.body.username}),
      req.body.password,
      (err, user) => {
        console.log(err);
        console.log(user);
        if (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.json({err: err});
        } else {
          if (req.body.firstname) {
            user.firstname = req.body.firstname;
          }
          if (req.body.lastname) {
            user.lastname = req.body.lastname;
          }
          user.save((err, user) => {
            if (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.json({err: err});
              return;
            }
            passport.authenticate('local')(req, res, () => {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.json({success: true, status: 'Registration Successful'});
            });
          });
        }
      });
  });

userRouter.route('/login')
  .post((req, res, next) => {
    passport.authenticate('local', (err, user, data) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.json({success: false, status: 'Login Unsuccessful', err: data});
      }
      req.logIn(user, err => {
        if (err) {
          return next(err);
        }
        const token = authenticate.getToken({_id: req.user._id});
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json({success: true, token: token, status: 'Successfully logged in'});
      });
    })(req, res, next);
  });

module.exports = userRouter;
