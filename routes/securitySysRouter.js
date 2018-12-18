'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const authenticate = require('../authenticate');
const filenameTracker = require('../utils/filename-tracker');
const ffmpeg = require('fluent-ffmpeg');
const videoDir = path.join(__dirname, '../../assets/videos/seccam/location/front-door');
const User = require('../models/user');
const url = require('url');

const secSysRouter = express.Router();

secSysRouter.route('/seccam')
  .get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    fs.readdir(videoDir, (err, files) => {
      if (err) {
        res.sendStatus(404);
      } else {
        const filenames = [];
        files.forEach(file => {
          if(file.indexOf('.') != -1) {
            filenames.push(file.split('.')[0]);
          }
        });
        console.log('got filenames', filenames);
        res.status = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(filenames);
      }
    });
  })
  .post(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    console.log('incoming video file');
    const filepath = path.join(__dirname, `../../assets/videos/seccam/location/front-door/${filenameTracker.getFilename()}.mp4`);
    const conversionStream = ffmpeg(req).noAudio();
    conversionStream
      .videoCodec('copy')
      .format('mp4')
      .inputOptions(['-re'])
      .output(filepath);

    conversionStream
      .on('end', () => {
        filenameTracker.reset();
        res.sendStatus(200);
      })
      .run();
  });

secSysRouter.route('/seccam/:filename')
  // TODO add authentication after client is fixed
  .get(authenticate.verifyVid, (req, res, next) => {
    const requested = req.params.filename;
    const filepath = path.join(__dirname, `../../assets/videos/seccam/location/front-door/${requested}.mp4`);
    if (!fs.existsSync(filepath)) {
      res.sendStatus(404);
    } else {
      const stat = fs.statSync(filepath)
      const fileSize = stat.size
      const range = req.headers.range

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10): fileSize - 1

        const chunksize = (end-start)+1
        const file = fs.createReadStream(filepath, {start, end})
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        }

        res.writeHead(206, head)
        file.pipe(res)
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        }
        res.writeHead(200, head)
        fs.createReadStream(filepath).pipe(res)
      }
    }
  });

module.exports = secSysRouter;
