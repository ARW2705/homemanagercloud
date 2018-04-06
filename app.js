'use strict';

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const passport = require('passport');

const mongoURL = process.env.MONGO_URL;
const connect = mongoose.connect(mongoURL);

// Mongoose models
const Climate = require('./models/climate');
const ClimateProgram = require('./models/climateprogram');

// REST routes
const users = require('./routes/users');
const climateRouter = require('./routes/climateRouter');
const garageDoorRouter = require("./routes/garageDoorRouter");

// MongoDB connection
connect.then(() => {
  const db = mongoose.connection;
  console.log("Database-Server connection established");

  // climate data document to be archived every 15 minutes
  addToClimateArchive = setInterval(() => {
    Climate.findOne({}).sort({_id: -1}).limit(1)
      .then(record => {
        if (record.archive) {
          // if climate data has not changed between 15 minute marks, increment
          // timespan which the current data document covers (default 1)
          Climate.findByIdAndUpdate(record.id, {$inc: {archiveSpan: 1}}, {new: true})
            .then(update => {
              console.log("No new climate data within interval - updating archive span", update);
            }, err => console.log(err));
        } else {
          // if new climate data since last archive trigger, set archive
          // property to true to avoid deletion during archive clean up
          Climate.findByIdAndUpdate(record.id, {$set: {archive: true}}, {new: true})
            .then(update => {
              console.log("Archived document", update);
            }, err => console.log(err));
        }
      }, err => console.log(err));
  }, (15 * 60 * 1000));
  // clean all climate documents that have not been selected for archiving in
  // addToClimateArchive method - cleans every 24 hours
  cleanClimateArchive = setInterval(() => {
    Climate.deleteMany({archive: false})
      .then(records => {
        console.log("Cleaning non-archived documents", records);
      }, err => console.log(err));
  }, (24 * 60 * 60 * 1000));

}, err => console.log(err)); // end database connection setup

const app = express();

// if request is http, redirect to secure server
app.all('*', (req, res, next) => {
  if (req.secure) return next();
  else res.redirect(307, `https://${req.hostname}:${app.get('secPort')}${req.url}`);
});

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());

// REST user api route - login required to access further routes
app.use('/users', users);

app.use(express.static(path.join(__dirname, 'public')));

// REST api routes
app.use('/climate', climateRouter);
app.use('/garagedoor', garageDoorRouter);

// catch 404 and forward error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err: {};
  res.status = err.status || 500;
  res.render('error');
});

module.exports = app;
