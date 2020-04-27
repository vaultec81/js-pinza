const yargs = require('yargs/yargs')(process.argv.slice(2))
const parser = yargs
  .demandCommand(1)
  .showHelpOnFail(false)
  .commandDir('commands')
  .help()
  .strict()
  .completion();

module.exports = parser;