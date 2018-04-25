'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const authenticate = require('../authenticate');
const GarageDoor = require('../models/garagedoor');

const garageDoorRouter = express.Router();

garageDoorRouter.use(bodyParser.json());

garageDoorRouter.route('/')
  .get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    GarageDoor.find({})
      .then(status => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(status[0]);
      }, err => next(err))
      .catch(err => next(err));
  });

module.exports = garageDoorRouter;
