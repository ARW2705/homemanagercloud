'use strict';

const fs = require('fs');
const path = require('path');

const SeccamVideo = require('../models/video');
const uploadTracker = require('../utils/upload-tracker');
const videoDir = path.join(__dirname, '../../assets/videos/seccam/location');

/**
 * Websocket connection for security camera messages
 *
 * params: object
 * io - secure websocket connection
 *
 * return: none
**/
const securitySysSocket = io => {

  io.on('connection', socket => {
    console.log('Client connected to security socket');

    socket.on('request-set-camera', data => {
      io.emit('proxy-request-set-camera', data);
    });

    socket.on('request-stream', data => {
      io.emit('proxy-request-stream', data);
    });

    socket.on('request-set-motion-detection', data => {
      io.emit('proxy-request-set-motion-detection', data);
    });

    socket.on('request-shutdown', () => {
      io.emit('proxy-request-shutdown');
    });

    socket.on('proxy-response-new-video-available', data => {
      console.log('new seccam video available', data.filename);
      if (uploadTracker.getFilename() == '_') {
        uploadTracker.setFilename(data.filename);
        io.emit('response-set-video-name', data);
      } else {
        // TODO send back response that naming is not ready
      }
    });

    socket.on('proxy-response-new-video-trigger-event', data => {
      console.log('seccam triggered', data.triggereEvent);
      if (uploadTracker.getTrigger() == '') {
        uploadTracker.setTrigger(data.triggerEvent);
      } else {
        // TODO send back response that trigger is not ready
      }
    });

    socket.on('request-get-video-list', () => {
      SeccamVideo.find({}).sort({createdAt: 'descending'}).limit(12)
        .then(filenames => {
          socket.emit('response-get-video-list', {data: filenames})
        }, err => socket.emit('response-get-video-list', {error: err}))
        .catch(err => socket.emit('response-get-video-list', {error: err}));
    });

    socket.on('request-get-videos-by-params', data => {
      SeccamVideo.find(data.query).sort({createdAt: 'descending'})
        .then(filenames => {
          socket.emit('response-get-video-list', {data: filenames});
        }, err => socket.emit('response-get-video-list', {error: err}))
        .catch(err => socket.emit('response-get-video-list', {error: err}));
    });

    socket.on('request-update-video-list', () => {
      // TODO convert to database query
      fetchFileList((err, filenames) => {
        if (err) {
          io.emit('response-get-video-list', {err: err});
        } else {
          console.log('got filenames', filenames);
          io.emit('response-get-video-list', {data: filenames});
        }
      });
    });

    socket.on('request-delete-video', data => {
      const requested = data.filename;
      const filepath = `${videoDir}/${data.location}/${requested}.mp4`;
      Seccam.deleteOne({filename: requested})
        .then(dbres => {
          fs.unlink(filepath, err => {
            if (err) {
              socket.emit('response-delete-video', {error: err});
            } else {
              io.emit('response-delete-video', data);
            }
          });
        }, err => socket.emit('response-delete-video', {error: err}))
        .catch(err => socket.emit('response-delete-video', {error: err}));
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected from security socket');
    });
  });

};

module.exports = securitySysSocket;
