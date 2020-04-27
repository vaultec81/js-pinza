
'use strict'

const os = require('os')
const fs = require('fs')
//const toUri = require('multiaddr-to-uri')
const { getRepoPath } = require('../utils')
const debug = require('debug')('pinza:cli:daemon')

module.exports = {
    command: 'daemon',

    describe: 'Start a long-running daemon process',

    builder(yargs) {
        return yargs
            .epilog(getRepoPath())
    },

    async handler(argv) {
        const { print, repoPath } = argv.ctx
        print('Initializing Pinza daemon...')
        print(`Pinza version: ${require('../../../package.json').version}`)
        print(`System version: ${os.arch()}/${os.platform()}`)
        print(`Node.js version: ${process.versions.node}`)

        let config = {}
        // read and parse config file
        if (argv.initConfig) {
            try {
                const raw = fs.readFileSync(argv.initConfig)
                config = JSON.parse(raw)
            } catch (error) {
                debug(error)
                throw new Error('Default config couldn\'t be found or content isn\'t valid JSON.')
            }
        }

        // Required inline to reduce startup time
        const Daemon = require('../daemon')
        const daemon = new Daemon({repoPath})

        try {
            await daemon.start()
            daemon._apiEndpoints((endpointAddress, endpointName) => {
                print(`${endpointName} listening on ${endpointAddress.toString()}`)
            })
        } catch (err) {
            throw err
        }

        print('Daemon is ready')

        const cleanup = async () => {
            print('Received interrupt signal, shutting down...')
            await daemon.stop()
            process.exit(0)
        }

        // listen for graceful termination
        process.on('SIGTERM', cleanup)
        process.on('SIGINT', cleanup)
        process.on('SIGHUP', cleanup)
    }
}