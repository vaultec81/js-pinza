'use strict'

module.exports = {
  command: 'config <key> [value]',

  description: 'Get and set Pinza config values.',

  builder: (yargs) => {
    return yargs
      //.commandDir('config')
      .option('bool', {
        type: 'boolean',
        describe: 'Set a boolean value.',
        default: false
      })
      .option('json', {
        type: 'boolean',
        describe: 'Parse stringified JSON.',
        default: false
      })
  },

  async handler({ ctx: { pinza, print }, value, bool, json, key, timeout }) {
    if (!value) {
      if (key === "show") {
        key = undefined; //Partial fix for showing the entire config.
      }
      // Get the value of a given key
      value = await pinza.config.get(key)

      if (typeof value === 'object') {
        print(JSON.stringify(value, null, 2))
      } else {
        print(value)
      }
    } else {
      // Set the new value of a given key

      if (bool) {
        value = (value === 'true')
      } else if (json) {
        try {
          value = JSON.parse(value)
        } catch (err) {
          throw new Error('invalid JSON provided')
        }
      }

      await pinza.config.set(key, value)
    }
  }
}