'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const zoneDataSchema = new Schema({
  id: {
    type: Number,
    required: true
  },
  deviceId: {
    type: Number,
    required: true
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number
  },
  locationName: {
    type: String,
    required: true
  }
});

const climateSchema = new Schema({
  zoneData: [zoneDataSchema],
  setMode: {
    type: String,
    required: true
  },
  setZone: {
    type: Number,
    default: 0
  },
  operatingStatus: {
    type: String,
    required: true
  },
  setTemperature: {
    type: Number,
    required: true
  },
  sleep: {
    type: Boolean,
    required: true
  },
  storedProgram: {
    type: String,
    default: ''
  },
  archive: {
    type: Boolean,
    required: true,
    default: false
  },
  archiveSpan: {
    type: Number,
    required: true,
    default: 1
  }
}, {
  timestamps: true
});

const Climate = mongoose.model('Climate', climateSchema);

module.exports = Climate;
