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

    // client requests confirmation thermostat is connected
    socket.on('request-ping-thermostat', _ => {
      console.log('pinging thermostat');
      // pass request to local server
      io.emit('proxy-request-ping-thermostat', {});
    });

    // client requests current climate data
    socket.on('request-get-climate-data', () => {
      console.log('proxy climate get request');
      // pass request to local server
      io.emit('proxy-request-get-climate-data', {});
    });

    // client requests a change to the climate control
    socket.on('request-update-climate-settings', update => {
      console.log('proxy climate settings update');
      // pass request to local server
      io.emit('proxy-request-update-climate-settings', update);
    });

    // client is requesting all programs
    socket.on('request-get-programs', () => {
      ClimatePrograms.find({})
        .then(programs => {
          // respond to client
          io.emit('response-get-programs', programs);
        })
        .catch(err => io.emit('response-get-programs', {error: err}));
    });

    // query thermostat for the program id that is stored there
    socket.on('request-get-thermostat-program-id', () => {
      io.emit('proxy-request-get-thermostat-program-id');
    });

    // client has selected a pre-program to use (or use none),
    // send message to thermostat to apply the change
    socket.on('request-select-program', id => {
      // id of 0 reserved for deselecting all programs
      if (!id) {
        console.log('Deactivate program');
        // pass request to local server
        io.emit('proxy-request-toggle-program', {isActive: false});
      } else {
        console.log('Activate program');
        Climate.find({}).sort({_id: -1}).limit(1)
          .then(latest => {
            if (latest.storedProgram == id) {
              // pass request to local server
              io.emit('proxy-request-toggle-program', {isActive: true});
            } else {
              ClimatePrograms.findById(id)
                .then(program => {
                  program.isActive = true;
                  // pass request to local server
                  io.emit('proxy-request-update-program', program);
                })
                .catch(err => io.emit('broadcast-proxy-response-update-program', {error: err}));
            }
          })
          .catch(err => io.emit('broadcast-proxy-response-update-program', {error: err}));
      }
    });

    // post new pre-program to list of programs and emit to all clients
    socket.on('request-create-program', program => {
      ClimatePrograms.create(program)
        .then(newProgram => {
          console.log('Saved new climate program');
          // add queryId string for thermostat usage
          newProgram['queryId'] = newProgram.id.toString();
          newProgram.save()
            .then(completedProgram => {
              // if set to active, update app and thermostat clients
              if (completedProgram.isActive) {
                // pass request to local server
                io.emit('proxy-request-update-program', completedProgram);
              } else {
                // respond to client if not active - no updated to thermostat needed
                io.emit('broadcast-response-create-program', completedProgram);
              }
            })
            .catch(err => socket.emit('broadcast-response-create-program', {error: err}));
        })
        .catch(err => socket.emit('broadcast-response-create-program', {error: err}));
    });

    // update a climate program - select to run program if it should be active
    socket.on('request-update-program', program => {
      ClimatePrograms.findByIdAndUpdate(program.id, program, {new: true})
        .then(update => {
          if (update.isActive) {
            // pass request to local server
            io.emit('proxy-request-update-program', update);
          }
          // respond to client if not active - no update to thermostat needed
          io.emit('broadcast-response-update-program', update);
        })
        .catch(err => io.emit('broadcast-response-update-program', {error: err}));
    });

    // delete a climate program - deactivate thermostat program if this was the
    socket.on('request-delete-program', id => {
      ClimatePrograms.findByIdAndRemove(id)
        .then(dbres => {
          if (dbres.isActive) {
            Climate.find({}).sort({_id: -1}).limit(1)
              .then(latest => {
                if (latest.storedProgram == id) {
                  // pass request to local server
                  io.emit('proxy-request-toggle-program', {isActive: false});
                }
              })
              .catch(err => io.emit('broadcast-response-delete-program', {error: err}));
          }
          // respond to client if was not active - no update to thermostat needed
          io.emit('broadcast-response-delete-program', dbres);
        })
        .catch(err => io.emit('broadcast-response-delete-program', {error: err}));
    });

    socket.on('request-update-zone-name', zone => {
      console.log('proxy request update zone name');
      // pass request to local server
      io.emit('proxy-request-update-zone-name', zone);
    });


    /**
     * ========== Thermostat originated events ==========
    **/

    // response to program toggle request
    socket.on('proxy-response-ping-thermostat', status => {
      // respond to client that thermostat is connected
      io.emit('broadcast-proxy-response-ping-thermostat', {});
    });

    // request to post thermostat climate data
    socket.on('proxy-request-post-climate-data', data => {
      console.log('new climate data', data);
      Climate.create(data)
        .then(newData => {
          console.log('stored climate data', newData);
          // respond to client with updated climate data
          io.emit('broadcast-proxy-response-post-climate-data', newData);
        })
        .catch(err => {
          io.emit('broadcast-proxy-response-post-climate-data', {error: err})
          console.log(err);
        });
    });

    socket.on('proxy-response-get-thermostat-program-id', id => {
      io.emit('broadcast-proxy-response-get-thermostat-program-id', id);
    });

    // thermostat response upon program toggle
    socket.on('proxy-response-toggle-program', status => {
      ClimatePrograms.findByIdAndUpdate(status.queryId, {isActive: status.isActive}, {new: true})
        .then(update => {
          // respond to client with updated program id and status
          io.emit('broadcast-proxy-response-toggle-program', status);
        })
        .catch(err => io.emit('broadcast-proxy-response-toggle-program', {error: err}));
    });

    socket.on('proxy-response-update-program', update => {
      ClimatePrograms.findByIdAndUpdate(update.queryId, update, {new: true})
        .then(updated => {
          // respond to client with updated program
          io.emit('broadcast-proxy-response-update-program', updated);
        })
        .catch(err => io.emit('broadcast-proxy-response-update-program', {error: err}));
    });

    // broadcast notification that thermostat connected was lost
    socket.on('request-update-thermostat-disconnection', timestamp => {
      // respond to client with disconnection timestamp
      io.emit('broadcast-request-update-thermostat-disconnection', timestamp);
    });

    // client socket disconnect
    socket.on('disconnect', () => {
      console.log(`Client ${socket.id} disconnected`);
    });

  });
};

module.exports = climateSocket;
