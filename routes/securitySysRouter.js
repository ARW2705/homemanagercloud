'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const authenticate = require('../authenticate');

const secSysRouter = express.Router();

secSysRouter.route('/seccam')
  .get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    // TODO handle responding to app client request for video
  })
  .post(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    let body = [];
    req
      .on('data', chunk => {
        body.push(chunk);
      })
      .on('end', () => {
        destination = path.join(__dirname, '../cache');
        body = Buffer.concat(body);
        fs.writeFileSync(`${destination}/cache.h264`, body, null);
        res.sendStatus(200);
      });
  });

module.exports = secSysRouter;
