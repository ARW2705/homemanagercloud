'use strict';

const mongoose = require('mongoose');

const Climate = require('../models/climate');
const ClimatePrograms = require('../models/climateprogram');

/**
 * Websocket connection for climate messages
 *
 * params: object
 * io - secure websocket connection
 *
 * return: none
**/
const climateSocket = io => {

  io.on('connection', socket => {
    console.log(`Client connected to climate socket: ${socket.id}`);

    /* ========== Client originated events ========== */

    // ping thermostat to confirm it is connected
    // socket.on('ping-thermostat', _ => {
    socket.on('request-ping-thermostat', _ => {
      console.log('pinging thermostat');
      // io.emit('echo-ping-thermostat');
      io.emit('proxy-request-ping-thermostat');
    });

    // client is requesting a change to the climate control
    // socket.on('request-patch-current-climate-data', update => {
    socket.on('request-update-current-climate-data', update => {
      console.log('Request from client, echo climate update to local node');
      // pass message along to local node
      // io.emit('local-request-patch-current-climate-data', {data: update});
      io.emit('proxy-request-update-current-climate-data', {data: update});
    });

    // client has selected a pre-program to use (or use none),
    // send message to thermostat to apply the change
    // socket.on('select-program', id => {
    socket.on('request-select-climate-program', id => {
      // id of 0 reserved for deselecting all programs
      ClimatePrograms.findOneAndUpdate({isActive: true}, {$set: {isActive: false}}, {new: true})
        .then(program => {
          if (id == 0) {
            console.log('No program running');
            // io.emit('request-select-program', {data: null});
            io.emit('proxy-request-select-climate-program', {data: null});
          } else {
            // find the program to be used and send it to the thermostat,
            // the document is set to active here, but can be overridden
            // by the response message handler from the thermostat in the
            // event that an error occurs in the thermostat
            ClimatePrograms.findByIdAndUpdate(id, {$set: {isActive: true}}, {new: true})
              .then(selected => {
                console.log('Selected program:', selected);
                // io.emit('request-select-program', {data: selected});
                io.emit('proxy-request-select-climate-program', {data: selected});
              }, err => socket.emit('error', {error: err}))
              .catch(err => socket.emit('error', {error: err}));
          }
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    // response message from thermostat after attempting to apply a pre-program
    // change, a status other than ok will deactivate any active program and also
    // emit an error message with the thermostat generated error message
    // socket.on('response-select-program', response => {
    socket.on('proxy-response-select-climate-program', response => {
      if (response.status === 'ok') {
        ClimatePrograms.findOne({isActive: true})
          .then(program => {
            // io.emit('echo-response-select-program', {data: program});
            io.emit('broadcast-response-select-climate-program', {data: program});
          }, err => socket.emit('error', {error: err}))
          .catch(err => socket.emit('error', {error: err}));
      } else {
        ClimatePrograms.findOneAndUpdate({isActive: true}, {$set: {isActive: false}}, {new: true})
          .then(program => {
            // io.emit('echo-response-select-program', {data: null});
            io.emit('broadcast-response-select-climate-program', {data: null});
            io.emit('error', {data: response.message});
          }, err => socket.emit('error', {error: err}))
          .catch(err => socket.emit('error', {error: err}));
      }
    });

    // post new pre-program to list of programs and emit to all clients
    // socket.on('post-new-program', program => {
    socket.on('request-create-climate-program', program => {
      ClimatePrograms.create(program)
        .then(newProgram => {
          // add new climate control program to db and update all app clients
          console.log('Saved new climate program', newProgram);
          // io.emit('echo-post-new-program', {data: newProgram});
          io.emit('broadcast-response-create-climate-program', {data: newProgram});
          // if set to active, update app and thermostat clients
          if (newProgram.isActive) {
            // io.emit('request-select-program', {data: newProgram});
            io.emit('proxy-request-select-climate-program', {data: newProgram});
          }
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    // update specified program and emit to all clients
    // socket.on('update-program', update => {
    socket.on('request-update-climate-program', update => {
      // if updated program was selected to be active, deactivate any running programs
      if (update.isActive) {
        ClimatePrograms.findOneAndUpdate({isActive: true}, {$set: {isActive: false}}, {new: true})
          .then(program => {
            // update data present
            ClimatePrograms.findByIdAndUpdate(update.id, {$set: update}, {new: true})
              .then(updated => {
                // send update of climate program to all clients
                console.log('Climate program has been updated', updated);
                // io.emit('echo-update-climate-program', {data: updated});
                // io.emit('request-select-program', {data: updated});
                io.emit('broadcast-response-update-climate-program', {data: updated});
                io.emit('proxy-request-select-climate-program', {data: updated});
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
            // io.emit('echo-update-climate-program', {data: updated});
            io.emit('broadcast-response-update-climate-program', {data: updated});
          }, err => socket.emit('error', {error: err}))
          .catch(err => socket.emit('error', {error: err}));
        }
    });

    // delete program by id and emit notification to all clients
    // socket.on('delete-program', id => {
    socket.on('request-delete-climate-program', id => {
      ClimatePrograms.findByIdAndRemove(id)
        .then(dbres => {
          // send notification to all clients
          console.log('Deleting climate program', dbres);
          // io.emit('echo-delete-climate-program', {data: dbres});
          io.emit('broadcast-response-delete-climate-program', {data: dbres});
          if (dbres.isActive) {
            // io.emit('request-select-program', {data: null});
            io.emit('proxy-request-select-climate-program', {data: null});
          }
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    /**
     * ========== Thermostat originated events ==========
    **/

    // thermostat websocket connected to local node
    // socket.on('thermostat-connection', datetime => {
    socket.on('response-udpate-thermostat-connection', datetime => {
      console.log(`Thermostat connected at ${datetime.connectedAt}`);
      // io.emit('echo-thermostat-connection', datetime);
      io.emit('broadcast-response-update-thermostat-connection', datetime);
    });

    // thermostat websocket has disconnected
    // socket.on('thermostat-disconnection', datetime => {
    socket.on('response-udpate-thermostat-disconnection', datetime => {
      console.log(`Thermostat disconnected at ${datetime.lastConnectedAt}`);
      // io.emit('echo-thermostat-disconnection', datetime);
      io.emit('broadcast-response-update-thermostat-disconnection', datetime);
    });

    // receive new climate data from thermostat
    // socket.on('response-post-current-climate-data', data => {
    socket.on('proxy-response-create-current-climate-data', data => {
      console.log("current climate data", data);
      Climate.create(data)
        .then(newData => {
          // emit current climate data to all clients
          console.log('Emitting new climate data');
          // io.emit('response-current-climate-data', {data: newData});
          io.emit('broadcast-response-create-current-climate-data', {data: newData});
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    // recieve updated climate data from thermostat
    // socket.on('response-patch-current-climate-data', data => {
    socket.on('proxy-response-update-current-climate-data', data => {
      console.log('updated current climate data', data);
      Climate.findOneAndUpdate({}, {$set: data}, {sort: {$natural: -1}, new: true})
        .then(updated => {
          console.log('Emitting updated climate data');
          // io.emit('response-current-climate-data', {data: updated});
          io.emit('broadcast-response-update-current-climate-data', {data: updated});
        }, err => socket.emit('error', {error: err}))
        .catch(err => socket.emit('error', {error: err}));
    });

    // emit when thermostat has been verified by the local node and send its
    // connection time
    // socket.on('thermostat-verified', connection => {
    socket.on('proxy-response-update-thermostat-verified', connection => {
      console.log(`Thermostat verified at ${connection.verifiedAt}`);
      // io.emit('echo-thermostat-verified', connection);
      io.emit('broadcast-response-update-thermostat-verified', connection);
    });

    // thermostat has requested initial data from database for climate data and
    // any pre-programs that are set to active
    // socket.on('ping-initial-data', _ => {
    socket.on('proxy-request-select-initial-climate-data-and-program', _ => {
      Climate.find({}).sort({_id: -1}).limit(1)
        .then(climate => {
          console.log('Sending requested initial climate values to thermostat');
          // io.emit('initial-climate-data', climate);
          io.emit('response-select-initial-climate-data', climate);
        });
      ClimatePrograms.find({isActive: true})
        .then(program => {
          console.log('Sending requested initial active program values to thermostat');
          if (!program.length) {
            // io.emit('initial-program-data', {none: true});
            io.emit('response-select-initial-climate-program-data', {none: true});
          } else {
            // io.emit('initial-program-data', program);
            io.emit('response-select-initial-climate-program-data', program);
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
