'use strict';

const fs = require('fs');
const path = require('path');
const filenameTracker = require('../utils/filename-tracker');
const videoDir = path.join(__dirname, '../../assets/videos/seccam/location/front-door');

/**
 * Get list of filenames from directory
 *
 * params: callback
 * cb - callback function to handle filename array or error
 *
 * return: none
**/
const fetchFileList = cb => {
  console.log('retreive video list');
  fs.readdir(videoDir, (err, files) => {
    if (files) {
      const filenames = [];
      files.forEach(file => {
        if(file.indexOf('.') != -1) {
          filenames.push(file.split('.')[0]);
        }
      });
      cb(null, filenames);
    } else if (err) {
      cb(err, null);
    } else {
      cb('Unknown error', null);
    }
  });
}

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
      if (filenameTracker.getFilename() == '_') {
        filenameTracker.setFilename(data.filename);
        io.emit('response-set-video-name', data);
      } else {
        // TODO send back response that naming is not ready
      }
    });

    socket.on('request-update-video-list', () => {
      fetchFileList((err, filenames) => {
        if (err) {
          io.emit('response-get-video-list', {err: err});
        } else {
          console.log('got filenames', filenames);
          io.emit('response-get-video-list', {data: filenames});
        }
      });
    });

    socket.on('request-get-video-list', () => {
      fetchFileList((err, filenames) => {
        if (err) {
          io.emit('response-get-video-list', {err: err});
        } else {
          console.log('got filenames', filenames);
          io.emit('response-get-video-list', {data: filenames});
        }
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected from security socket');
    });
  });

};

module.exports = securitySysSocket;
