'use strict';

const socketioStream = require('socket.io-stream');
const fs = require('fs');

const securitySysSocket = io => {

  io.on('connection', socket => {
    console.log('Proxy stream connected');

    socketioStream(socket).on('proxy-response-stream-video', stream => {
      console.log('Caught stream');
      stream.pipe(fs.createWriteStream('../test/it-worked.h264'));
    });

    socket.on('disconnect', () => {
      console.log('Proxy stream ended');
    });
  })

};

module.exports = securitySysSocket;
