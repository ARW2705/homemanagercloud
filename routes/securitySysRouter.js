'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = require('ffprobe');
const ffprobeStatic = require('ffprobe-static');

const authenticate = require('../authenticate');
const uploadTracker = require('../utils/upload-tracker');

const SeccamVideo = require('../models/video');
const videoDir = path.join(__dirname, '../../assets/videos/seccam/location/front-door');

/**
 * Parse filename which is a unix timestamp (in seconds)
 *
 * params: none
 *
 * return: object
 * - Promise that resolves with object containing start timestamp, end timestamp,
 *   and duration in seconds
**/
const generateDateTimeData = () => {
  const base = uploadTracker.getFilename();
  return new Promise((resolve, reject) => {
    ffprobe(`${videoDir}/${base}.mp4`, {path: ffprobeStatic.path})
      .then(info => {
        console.log(info);
        const duration = info.streams[0].duration;
        const start = parseInt(base * 1000);
        const end = start + (duration * 1000);
        return Promise.resolve({
          start: new Date(start),
          end: new Date(end),
          duration: duration
        });
      })
      .catch(err => {
        console.error(err);
        return Promise.reject(err);
      });
  });
};

const secSysRouter = express.Router();

secSysRouter.route('/seccam')
  .post(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    console.log('incoming video file');
    if (!uploadTracker.isUploadReady()) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.json({'error': 'file upload error'});
    } else {
      const filepath = `${videoDir}/${uploadTracker.getFilename()}.mp4`;
      const conversionStream = ffmpeg(req).noAudio();
      conversionStream
        .videoCodec('copy')
        .format('mp4')
        .inputOptions(['-re'])
        .output(filepath);

      conversionStream
        .on('end', () => {
          generateDateTimeData()
            .then(dt => {
              SeccamVideo.create({
                filename: uploadTracker.getFilename(),
                startDateTime: dt.start,
                endDateTime: dt.end,
                duration: dt.duration,
                triggerEvent: uploadTracker.getTrigger()
              })
              .then(_ => {
                res.sendStatus(201);
              }, err => {
                res.statusCode = 500;
                res.setHeader('content-type', 'application/json');
                res.json({error: err});
              })
            })
            .catch(err => {
              res.statusCode = 500;
              res.setHeader('content-type', 'application/json');
              res.json({error: err});
            })
            .finally(() => {
              uploadTracker.reset();
            })
        })
        .run();
    }
  });

// Video player route
secSysRouter.route('/seccam/:filename')
  .get(authenticate.verifyVideo, (req, res, next) => {
    const requested = req.params.filename;
    const filepath = `${videoDir}/${requested}.mp4`;
    if (!fs.existsSync(filepath)) {
      res.sendStatus(404);
    } else {
      const stat = fs.statSync(filepath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace('bytes=', '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10): fileSize - 1;

        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filepath, {start, end});
        const headers = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };

        res.writeHead(206, headers);
        file.pipe(res);
      } else {
        const headers = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, headers);
        fs.createReadStream(filepath).pipe(res);
      }
    }
  });

module.exports = secSysRouter;
