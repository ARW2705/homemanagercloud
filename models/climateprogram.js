'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const climateProgramSchema = new Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  program: {
    type: [Number],
    required: true
  },
  mode: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  timestamps: true
});

const ClimateProgram = mongoose.model('ClimateProgram', climateProgramSchema);

module.exports = ClimateProgram;
