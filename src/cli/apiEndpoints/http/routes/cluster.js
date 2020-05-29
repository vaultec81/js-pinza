const resources = require('../resources')
module.exports = [
    {
        method: 'POST',
        path: '/api/v0/cluster/mycommitment',
        options: {},
        handler: resources.cluster.myCommitment.handler
    },
    {
        method: 'POST',
        path: '/api/v0/cluster/create',
        options: {},
        handler: resources.cluster.create.handler
    },
    {
        method: 'POST',
        path: '/api/v0/cluster/pin/add',
        options: {},
        handler: resources.cluster.pin.handler
    },
    {
        method: 'POST',
        path: '/api/v0/cluster/pin/rm',
        options: {},
        handler: resources.cluster.unpin.handler
    },
    {
        method: 'POST',
        path: '/api/v0/cluster/pin/ls',
        options: {},
        handler: resources.cluster.pinls.handler
    },
    {
        method: 'POST',
        path: '/api/v0/cluster/export',
        options: {},
        handler: resources.cluster.export.handler
    }
]