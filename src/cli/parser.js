const args = process.argv.slice(2);
const yargs = require('yargs/yargs')(args)
const parser = yargs
  .commandDir('commands')
  .showHelpOnFail(true)
  .strict()
  .scriptName("pinza")
  .completion();

if(args.length === 0) {
  yargs.showHelp()
}
module.exports = parser;