'use strict';

// filename does not include extensions
const UploadTracker = module.exports = {
  name: '_',
  event: '',
  setFilename: newName => {
    UploadTracker.name = newName;
  },
  getFilename: () => {
    return UploadTracker.name;
  },
  setTrigger: event => {
    UploadTracker.event = event;
  },
  getTrigger: () => {
    return UploadTracker.event;
  },
  isUploadReady: () => {
    return UploadTracker.name != '_' && UploadTracker.event != '';
  },
  reset: () => {
    UploadTracker.name = '_';
    UploadTracker.event = '';
  }
};
