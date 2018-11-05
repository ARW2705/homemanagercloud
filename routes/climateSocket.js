'use strict';

const mongoose = require('mongoose');

const Climate = require('../models/climate');
const ClimatePrograms = require('../models/climateprogram');

const climateSocket = io => {

  io.on('connection', socket => {
    console.log(`Client connected to climate socket: ${socket.id}`);

    /* App originated events */

    // ping thermostat to confirm it is connected and functional
    socket.on('ping-thermostat', _ => {
      console.log('pinging thermostat');
      io.emit('echo-ping-thermostat');
    });

    socket.on('ping-local-node', _ => {
      console.log('pinging local node');
      io.emit('echo-ping-local-node');
    });

    // user is requesting a change to the climate control
    socket.on('request-patch-current-climate-data', update => {
      console.log('Request from client, echo climate update to local node');
      // pass message along to local node
      io.emit('local-request-patch-current-climate-data', {data: update});
    });

    // receive new climate data from thermostat
    socket.on('response-post-current-climate-data', data => {
      console.log("current climate data", data);
      Climate.create(data)
        .then(newData => {
          // emit current climate data to all clients
          console.log('Emitting new climate data');
          io.emit('response-current-climate-data', {data: newData});
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    // recieve updated climate data from thermostat
    socket.on('response-patch-current-climate-data', data => {
      console.log('updated current climate data', data);
      Climate.findOneAndUpdate({}, {$set: data}, {sort: {$natural: -1}, new: true})
        .then(updated => {
          console.log('Emitting updated climate data');
          io.emit('response-current-climate-data', {data: updated});
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
            io.emit('local-select-program', {data: null});
          } else {
            ClimatePrograms.findByIdAndUpdate(id, {$set: {isActive: true}}, {new: true})
              .then(selected => {
                console.log('Selected program:', selected);
                io.emit('local-select-program', {data: selected});
              }, err => socket.emit('error', {error: err}))
              .catch(err => socket.emit('error', {error: err}));
          }
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    socket.on('response-select-program', response => {
      if (response.status === 'ok') {
        ClimatePrograms.findOne({isActive: true})
          .then(program => {
            io.emit('echo-response-select-program', {data: program});
          }, err => socket.emit('error', {error: err}))
          .catch(err => socket.emit('error', {error: err}));
      } else {
        ClimatePrograms.findOneAndUpdate({isActive: true}, {$set: {isActive: false}}, {new: true})
          .then(program => {
            io.emit('echo-response-select-program', {data: null});
            io.emit('error', {data: response.message});
          }, err => socket.emit('error', {error: err}))
          .catch(err => socket.emit('error', {error: err}));
      }
    });

    // post new pre-program to list of programs and emit to all clients
    socket.on('post-new-program', program => {
      ClimatePrograms.create(program)
        .then(newProgram => {
          // add new climate control program to db and update all app clients
          console.log('Saved new climate program', newProgram);
          io.emit('echo-post-new-program', {data: newProgram});
          // if set to active, update app and thermostat clients
          if (newProgram.isActive) {
            io.emit('local-select-program', {data: newProgram});
          }
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    // update specified program and emit to all clients
    socket.on('update-program', update => {
      // if updated program was selected to be active, deactivate any running programs
      if (update.isActive) {
        ClimatePrograms.findOneAndUpdate({isActive: true}, {$set: {isActive: false}}, {new: true})
          .then(program => {
            // update data present
            ClimatePrograms.findByIdAndUpdate(update.id, {$set: update}, {new: true})
              .then(updated => {
                // send update of climate program to all clients
                console.log('Climate program has been updated', updated);
                io.emit('echo-update-climate-program', {data: updated});
                io.emit('local-select-program', {data: updated});
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
            io.emit('echo-update-climate-program', {data: updated});
          }, err => socket.emit('error', {error: err}))
          .catch(err => socket.emit('error', {error: err}));
        }
    });

    // delete program by id and emit notification to all clients
    socket.on('delete-program', id => {
      ClimatePrograms.findByIdAndRemove(id)
        .then(dbres => {
          // send notification to all clients
          console.log('Deleting climate program', dbres);
          io.emit('echo-delete-climate-program', {data: dbres});
          if (dbres.isActive) {
            io.emit('local-select-program', {data: null});
          }
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    /* IOT originated events */
    socket.on('local-node-connection', connection => {
      console.log(`Local node connection at ${connection.nodeConnectedAt}`);
      io.emit('echo-local-node-connection', connection);
    });

    socket.on('thermostat-connection', datetime => {
      console.log(`Thermostat connected at ${datetime.connectedAt}`);
      io.emit('echo-thermostat-connection', datetime);
    });

    socket.on('thermostat-disconnection', datetime => {
      console.log(`Thermostat disconnected at ${datetime.lastConnectedAt}`);
      io.emit('echo-thermostat-disconnection', datetime);
    });

    // emit when thermostat has been verified by the local node and send its
    // connection time
    socket.on('thermostat-verified', connection => {
      console.log(`Thermostat verified at ${connection.connectedAt}`);
      io.emit('echo-thermostat-verified', connection);
    });

    socket.on('ping-initial-data', _ => {
      Climate.find({}).sort({_id: -1}).limit(1)
        .then(climate => {
          console.log('Sending requested initial climate values to thermostat');
          io.emit('initial-climate-data', climate);
        });
      ClimatePrograms.find({isActive: true})
        .then(program => {
          console.log('Sending requested initial active program values to thermostat');
          if (!program.length) {
            io.emit('initial-program-data', {none: true});
          } else {
            io.emit('initial-program-data', program);
          }
        });
    });

    // client socket disconnect
    socket.on('disconnect', () => {
      console.log(`Client ${socket.id} disconnected`);
    });

  });
};

module.exports = climateSocket;
