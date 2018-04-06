'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const garageDoorSchema = new Schema({
  inMotion: {
    type: Boolean,
    required: true
  },
  motionDirection: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  targetPosition: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const GarageDoor = mongoose.model('GarageDoor', garageDoorSchema);

module.exports = GarageDoor;
