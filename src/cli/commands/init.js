'use strict'

const fs = require('fs')
const debug = require('debug')('pinza:cli:init')
const { pinzaPathHelp } = require('../utils')

module.exports = {
  command: 'init [default-config] [options]',
  describe: 'Initialize a local Pinza node.',
  builder (yargs) {
    return yargs
      .epilog(pinzaPathHelp)
      .positional('default-config', {
        describe: 'Node config, this should be a path to a file or JSON and will be merged with the default config.',
        type: 'string'
      })
  },

  async handler (argv) {
    const { print, repoPath } = argv.ctx
    let config = {}
    // read and parse config file
    if (argv.defaultConfig) {
      try {
        const raw = fs.readFileSync(argv.defaultConfig)
        config = JSON.parse(raw)
      } catch (error) {
        debug(error)
        throw new Error('Default config couldn\'t be found or content isn\'t valid JSON.')
      }
    }

    print(`Initializing ipfs node at ${repoPath}`)

    // Required inline to reduce startup time
    const Client = require('../../core/Client')

    const client = await Client({
      path: repoPath
    })

    try {
      await client.init({
        config
      })
    } catch (err) {
      throw err
    }
  }
}