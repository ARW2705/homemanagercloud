'use strict';

// filename does not include extensions
const FilenameTracker = module.exports = {
  name: '_',
  setFilename: newName => {
    FilenameTracker.name = newName;
  },
  getFilename: () => {
    return FilenameTracker.name;
  },
  reset: () => {
    FilenameTracker.name = '_';
  }
};
