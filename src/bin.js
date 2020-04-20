const Client = require('./Client');
const IPFSHttpAPI = require('ipfs-http-client');

(async() => {
    const client = new Client(new IPFSHttpAPI())
    await client.start()
    var cluster = await client.createCluster("MyCluster")
    await cluster.pin.add("QmT8NhSFEbFrex8h32AyPNda9N178tk8bRwWqgNaAw2EjZ")
    //core.pin._reindex();
})();

