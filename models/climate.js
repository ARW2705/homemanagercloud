'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const zoneDataSchema = new Schema({
  locationId: {
    type: Number,
    required: true
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  locationName: {
    type: String,
    required: true
  }
});

const climateSchema = new Schema({
  zoneData: [zoneDataSchema],
  selectedMode: {
    type: String,
    required: true
  },
  selectedZone: {
    type: Number,
    default: 0
  },
  operatingStatus: {
    type: String,
    required: true
  },
  targetTemperature: {
    type: Number,
    required: true
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
