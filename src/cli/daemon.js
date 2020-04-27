const debug = require('debug')('pinza:daemon')
const Pinza = require('../Client'); //Pinza client.
const Components = require('../Components')
const IPFSApiClient = require('ipfs-http-client')
const endpoints = require('./apiEndpoints')

class Daemon {
  constructor(options) {
    this._options = options || {};
    this.repoPath = options.repoPath;
    this.config = new Components.Config(this.repoPath)
    
    

  }
  _apiEndpoints(iteratorCallback) {
    this.apiEndpoints._apiEndpoints(iteratorCallback)
  }
  async start() {
    await this.config.open()
    if(this._options.internalDaemon === true | this.config.get("ipfs.internalDaemon") === true) {
      //Create ipfs daemon here...
      throw "Internal daemon is now supported yet"
    } else {
      //Use ipfs HTTP api
      this._ipfs = new IPFSApiClient(this.config.get("ipfs.apiAddr"))
    }

    debug("starting")
    this.client = new Pinza(this._ipfs);
    await this.client.start();
    this.apiEndpoints = new endpoints(this.client)
    await this.apiEndpoints.start();
  }
  async stop() {
    await this.apiEndpoints.stop();
    await this.client.stop();
  }
}
module.exports = Daemon