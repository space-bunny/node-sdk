/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// eslint-disable-next-line import/no-mutable-exports
let spacebunny;
if (typeof window === 'undefined') {
  // running in node
  spacebunny = require('./spacebunny');
} else {
  // running in the browser
  spacebunny = require('./spacebunny.var');
}

module.exports = spacebunny;
