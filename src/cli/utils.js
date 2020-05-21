const EnvironmentAdapter = require('../core/EnvironmentAdapter')
const HTTPClient = require('../HTTPClient')
const fs = require('fs')
const Path = require('path')
const multiaddr = require('multiaddr')
let visible = true
const disablePrinting = () => { visible = false }

const print = (msg, includeNewline = true, isError = false) => {
    if (visible) {
        if (msg === undefined) {
            msg = ''
        }
        msg = includeNewline ? msg + '\n' : msg
        const outStream = isError ? process.stderr : process.stdout
        outStream.write(msg)
    }
}

print.clearLine = () => {
    return process.stdout.clearLine()
}

print.cursorTo = (pos) => {
    process.stdout.cursorTo(pos)
}

print.write = (data) => {
    process.stdout.write(data)
}

print.error = (msg, newline) => {
    print(msg, newline, true)
}

// used by ipfs.add to interrupt the progress bar
print.isTTY = process.stdout.isTTY
print.columns = process.stdout.columns

module.exports = {
    getRepoPath: () => {
        if (process.env.pinza_path) {
            return process.env.pinza_path
        } else {
            return EnvironmentAdapter.repoPath()
        }
    },
    print,
    getPinza: () => {
        var repoPath = module.exports.getRepoPath()
        var apiAddr = multiaddr(fs.readFileSync(Path.join(repoPath, "apiAddr")).toString());
        var pinza = new HTTPClient(apiAddr);

        return {
            pinza,
            isDaemon: false
        }
    }
}