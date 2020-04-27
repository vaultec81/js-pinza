const resources = require('../resources')
module.exports = [
    {
        method: 'GET',
        path: '/api/v0/cluster/mycommitment',
        options: {},
        handler: resources.cluster.myCommitment.handler
    }
]