const resources = require('../resources')
module.exports = [
    {
        method: 'POST',
        path: '/api/v0/cluster/pin/commitment',
        options: {},
        handler: resources.cluster.currentCommitment.handler
    },
    {
        method: 'POST',
        path: '/api/v0/cluster/create',
        options: {},
        handler: resources.cluster.create.handler
    },
    {
        method: 'POST',
        path: '/api/v0/cluster/join',
        options: {},
        handler: resources.cluster.join.handler
    },
    {
        method: 'POST',
        path: '/api/v0/cluster/leave',
        options: {},
        handler: resources.cluster.leave.handler
    },
    {
        method: 'POST',
        path: '/api/v0/cluster/open',
        options: {},
        handler: resources.cluster.open.handler
    },
    {
        method: 'POST',
        path: '/api/v0/cluster/close',
        options: {
            validate: resources.cluster.close.validate
        },
        handler: resources.cluster.close.handler
    },
    {
        method: 'POST',
        path: '/api/v0/cluster/status',
        options: {
            validate: resources.cluster.status.validate
        },
        handler: resources.cluster.status.handler
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