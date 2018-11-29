'use strict';

const socketioStream = require('socketio-stream');
const fs = require('fs');

const securitySysSocket = io => {

  io.on('connection', socket => {
    console.log('Proxy stream connected');

    socketioStream(socket).on('proxy-response-stream-video', stream => {
      stream.pipe(fs.createWriteStream('../tmp/it-worked.h264'));
    });

    socket.on('disconnect', () => {
      console.log('Proxy stream ended');
    });
  })

};

module.exports = securitySysSocket;
