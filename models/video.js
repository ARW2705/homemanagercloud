'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const videoSchema = new Schema({
  filename: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  startDateTime: {
    type: Date,
    required: true
  },
  endDateTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  tiggerEvent: {
    type: String,
    required: true
  },
  starred: {
    type: Boolean,
    required: true,
    default: false
  }
});

const Video = mongoose.model('SeccamVideo', videoSchema);

module.exports = Video;
