'use strict';

const FilenameTracker = module.exports = {
  name: 'NameError',
  setFilename: newName => {
    FilenameTracker.name = newName;
  },
  getFilename: () => {
    return FilenameTracker.name;
  }
};
