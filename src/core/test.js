const Client = require('./Client');
const IPFSHttpAPI = require('ipfs-http-client');

(async() => {
    const client = new Client(new IPFSHttpAPI())
    await client.start()
    var cluster = await client.openCluster("MyCluster")
    await cluster.pin.add("QmRh3E8nspRs57phegmkRVW17TSgidL8qu6ZCFt1ucfLwp")
})();

