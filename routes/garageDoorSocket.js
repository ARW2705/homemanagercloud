'use strict';

const mongoose = require('mongoose');

const GarageDoor = require('../models/garagedoor');
const doorId = process.env.GARAGE_DOOR_ID;

const garageDoorSocket = io => {

  io.on('connection', socket => {
    console.log('Client connected to garage door socket');

    // garage door operation requested
    socket.on('operate-garage-door', status => {
      GarageDoor.findByIdAndUpdate(doorId, {$set: status}, {new: true})
        .then(update => {
          console.log('Garage door operation');
          io.emit('garage-door-status-changed', {data: update});
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    // client socket disconnect
    socket.on('disconnect', () => {
      console.log('Secure client disconnected from climate socket');
    });

  });
};

module.exports = garageDoorSocket;
