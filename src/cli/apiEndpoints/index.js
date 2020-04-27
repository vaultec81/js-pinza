const endpoints = {
    http: require('./http')
}

class apiEndpoints {
    constructor(pinza) {
        this.pinza = pinza;
        this.endpoints = {};
    }
    _apiEndpoints(iteratorCallback) {
        for(var endpoint of Object.values(this.endpoints)) {
            iteratorCallback(endpoint.address, endpoint.name)
        }
    }
    async start() {
        for(var name in endpoints) {
            var endpoint = new endpoints[name](this.pinza);
            await endpoint.start();
            this.endpoints[name] = endpoint;
        }
    }
    async stop() {
        for(var endpoint of Object.values(this.endpoints)) {
            await endpoint.stop()
        }
    }
}
module.exports = apiEndpoints