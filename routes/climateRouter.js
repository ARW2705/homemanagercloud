'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const authenticate = require('../authenticate');
const Climate = require('../models/climate');
const ClimatePrograms = require('../models/climateprogram');

const climateRouter = express.Router();

climateRouter.use(bodyParser.json());

climateRouter.route('/')
  .get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    // get current climate data for app and thermostat clients
    Climate.find({}).sort({_id: -1}).limit(1)
      .then(climate => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        const tstatPayload = {};
        // send only required data to thermostat to reduce buffer size
        if (req.headers.tstat_key) {
          console.log("Thermostat request");
          tstatPayload.selectedMode = climate[0].selectedMode;
          tstatPayload.selectedZone = climate[0].selectedZone;
          tstatPayload.targetTemperature = climate[0].targetTemperature;
          res.json(tstatPayload);
        } else {
        res.json(climate[0]);
        }
      }, err => next(err))
      .catch(err => next(err));
  });

climateRouter.route('/programs')
  // get all pre-programmed thermostat values for app
  .get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    ClimatePrograms.find({})
      .then(programs => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(programs);
      }, err => next(err))
      .catch(err => next(err));
  });

climateRouter.route('/programs/active-program')
  // get active program, if one is running
  .get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    ClimatePrograms.find({isActive: true})
      .then(program => {
        if (!program.length) {
          console.log("No active programs");
          res.statusCode = 204;
          res.send();
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        const tstatPayload = {};
        // send only required data to thermostat to reduce buffer size
        if (req.headers.tstat_key) {
          tstatPayload.name = program[0].name;
          tstatPayload.mode = program[0].mode;
          tstatPayload.isActive = program[0].isActive;
          tstatPayload.program = program[0].program;
          res.json(tstatPayload);
        } else {
          res.json(program);
        }
      }, err => next(err))
      .catch(err => next(err));
  });

climateRouter.route('/programs/:programId')
  // get specified program for app and thermostat
  .get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    ClimatePrograms.findById(req.params.programId)
      .then(program => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(program);
      }, err => next(err))
      .catch(err => next(err));
  });

  climateRouter.route('/history/:timeSpan')
    .get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
      // get number of records to retrieve - timeSpan is in days,
      // each record is 15 minutes apart,
      // archiveSpan is the number of 15 minute timeframes in which the climate
      // data had not changed
      const specifiedTimeFrame = req.params.timeSpan * 24 * 4;
      const filteredRecords = [];
      let currentTimeFrame = 0;
      Climate.find({archive: true}).sort({_id: -1}).limit(specifiedTimeFrame)
        .then(records => {
          for (let i=0; i<records.length; i++) {
            // once the correct number of records is collected, break the loop
            if (specifiedTimeFrame === currentTimeFrame) break;
            // track if a record has a time span over greater than 15 minutes
            currentTimeFrame += records[i].archiveSpan;
            filteredRecords.push(records[i]);
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.json(filteredRecords);
        }, err => next(err))
        .catch(err => next(err));
    });

module.exports = climateRouter;
