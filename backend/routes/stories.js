// Must point at the folder index explicitly. require('./stories') from this
// file would resolve back to stories.js itself, mounting an empty router.
module.exports = require('./stories/index');
