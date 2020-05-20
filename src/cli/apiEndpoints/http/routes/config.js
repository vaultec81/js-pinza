'use strict'

const resources = require('../resources')

module.exports = [
    {
        method: 'POST',
        path: '/api/v0/config/{key?}',
        ...resources.config.getOrSet
    },
    {
        method: 'POST',
        path: '/api/v0/config/show',
        ...resources.config.show
    }
]