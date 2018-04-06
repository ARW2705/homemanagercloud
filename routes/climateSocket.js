'use strict';

const mongoose = require('mongoose');

const Climate = require('../models/climate');
const ClimatePrograms = require('../models/climateprogram');

const climateSocket = io => {

  io.on('connection', socket => {
    console.log(`Client connected to climate socket: ${socket.id}`);

    /* App originated events */

    // update current climate operation status from app, overrides and
    // deactivates any active program
    socket.on('patch-current-climate-data', update => {
      console.log('patch climate data', update);
      // find active program (if any) and deactivate
      ClimatePrograms.findOneAndUpdate({isActive: true}, {$set: {isActive: false}}, {new: true})
        .then(program => {
          if (program != null) console.log("Deactivating running program", program.name);
          Climate.findOneAndUpdate({}, {$set: update}, {sort: {$natural: -1}, new: true})
            .then(updated => {
              console.log('Emitting updated climate data');
              io.emit('updated-climate-data', {data: updated});
            }, err => socket.emit('error', {error: err}));
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });
    // post new pre-program to list of programs and emit to all clients
    socket.on('post-new-program', program => {
      ClimatePrograms.create(program)
        .then(newProgram => {
          // add new climate control program to db and update all app clients
          console.log('Saved new climate program', newProgram);
          io.emit('new-climate-program', {data: newProgram});
          // if set to active, update app and thermostat clients
          if (newProgram.isActive) {
            io.emit('selected-program', {data: newProgram});
          }
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    // select specified program to run and emit to all clients
    socket.on('select-program', id => {
      // id of 0 reserved for deselecting all programs
      ClimatePrograms.findOneAndUpdate({isActive: true}, {$set: {isActive: false}}, {new: true})
        .then(program => {
          if (id == 0) {
            console.log('No program running');
            io.emit('selected-program', {data: null});
          } else {
            ClimatePrograms.findByIdAndUpdate(id, {$set: {isActive: true}}, {new: true})
              .then(selected => {
                console.log('Selected program:', selected);
                io.emit('selected-program', {data: selected});
              }, err => socket.emit('error', {error: err}))
              .catch(err => socket.emit('error', {error: err}));
          }
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    // update specified program and emit to all clients
    socket.on('update-specified-program', update => {
      // if updated program was selected to be active, deactivate any running programs
      if (update.isActive) {
        ClimatePrograms.findOneAndUpdate({isActive: true}, {$set: {isActive: false}}, {new: true})
          .then(program => {
            // update data present
            ClimatePrograms.findByIdAndUpdate(update.id, {$set: update}, {new: true})
              .then(updated => {
                // send update of climate program to all clients
                console.log('Climate program has been updated', updated);
                io.emit('updated-climate-program', {data: updated});
                io.emit('selected-program', {data: selected});
              }, err => socket.emit('error', {error: err}))
              .catch(err => socket.emit('error', {error: err}));
          }, err => socket.emit('error', {error: err}))
          .catch(err => socket.emit('error', {error: err}));
      } else {
        // update specified program without changing an active program's status
        ClimatePrograms.findByIdAndUpdate(update.id, {$set: update}, {new: true})
          .then(updated => {
            // send update of climate program to all clients
            console.log('Climate program has been updated', updated);
            io.emit('updated-climate-program', {data: updated});
          }, err => socket.emit('error', {error: err}))
          .catch(err => socket.emit('error', {error: err}));
        }
    });

    // delete program by id and emit notification to all clients
    socket.on('delete-specified-program', id => {
      ClimatePrograms.findByIdAndRemove(id)
        .then(dbres => {
          // send notification to all clients
          console.log('Deleting climate program', dbres);
          io.emit('deleted-climate-program', {data: dbres});
          if (dbres.isActive) {
            io.emit('selected-program', {data: null});
          }
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    /* IOT originated events */

    // receive new climate data from thermostat
    socket.on('post-current-climate-data', data => {
      console.log("current climate data");
      Climate.create(data)
        .then(newData => {
          // emit current climate data to all clients
          console.log('Emitting new climate data');
          io.emit('new-climate-data', {data: newData});
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    // client socket disconnect
    socket.on('disconnect', () => {
      console.log(`Client ${socket.id} disconnected`);
    });

  });
};

module.exports = climateSocket;
