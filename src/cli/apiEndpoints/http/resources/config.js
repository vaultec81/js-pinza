const Boom = require('@hapi/boom')
const Joi = require('@hapi/joi')

exports.getOrSet = {
  options: {
    payload: {
      parse: false,
      output: 'stream'
    },
    pre: [{
      assign: 'args',
      method: (request, h) => {
        const parseValue = (args) => {
          if (request.query.bool) {
            args.value = args.value === 'true'
          } else if (request.query.json) {
            try {
              args.value = JSON.parse(args.value)
            } catch (err) {
              log.error(err)
              throw Boom.badRequest('failed to unmarshal json. ' + err)
            }
          }

          return args
        }

        if (request.query.arg instanceof Array) {
          return parseValue({
            key: request.query.arg[0],
            value: request.query.arg[1]
          })
        }

        if (request.params.key) {
          return parseValue({
            key: request.params.key,
            value: request.query.arg
          })
        }

        if (!request.query.arg) {
          throw Boom.badRequest("Argument 'key' is required")
        }

        return { key: request.query.arg }
      }
    }],
    validate: {
      options: {
        allowUnknown: true,
        stripUnknown: true
      },
      query: Joi.object().keys({
        arg: Joi.array().single(),
        key: Joi.string(),
        bool: Joi.boolean().truthy(''),
        json: Joi.boolean().truthy('')
      })
    }
  },
  async handler(request, h) {
    const {
      pre: {
        args: {
          key,
          value
        }
      },
      server: {
        app: {
          pinza
        }
      }
    } = request

    if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
      // serialized node buffer?
      throw Boom.badRequest('Invalid value')
    }



    if (value === undefined) {
      // Get the value of a given key
      const existingValue = await pinza.config.get(key)

      if (existingValue === undefined) {
        throw Boom.notFound('Failed to get config value: key has no attributes')
      }

      return h.response({
        Key: key,
        Value: existingValue
      })
    }

    // Set the new value of a given key
    const result = await pinza.config.set(key, value)
    if (!result) {
      throw Boom.badRequest('Failed to set config value')
    }

    return h.response({
      Key: key,
      Value: value
    })
  }
}

exports.get = {
  options: {
    validate: {
      options: {
        allowUnknown: true,
        stripUnknown: true
      }
    }
  },
  handler: async (request, h) => {
    const {
      server: {
        app: {
          pinza
        }
      }
    } = request

    let config
    try {
      config = await pinza.config.get(undefined)
    } catch (err) {
      throw Boom.boomify(err, { message: 'Failed to get config value' })
    }

    return h.response({
      Value: config
    })
  }
}

exports.show = {
  options: {
    validate: {
      options: {
        allowUnknown: true,
        stripUnknown: true
      }
    }
  },
  handler: async (request, h) => {
    const {
      server: {
        app: {
          pinza
        }
      },
    } = request

    let config
    try {
      config = await pinza.config.get(undefined)
    } catch (err) {
      throw Boom.boomify(err, { message: 'Failed to get config value' })
    }

    return h.response(config)
  }
}