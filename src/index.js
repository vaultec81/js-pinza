'use strict'

const HTTPClient = require('./HTTPClient');
const core = require('./core/Client');

core.HTTPClient = HTTPClient
module.exports = core;
