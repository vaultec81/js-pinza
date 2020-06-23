const multiaddr = require('multiaddr');
const axios = require('axios')
const toUrlSearchParams = require('./lib/to-url-search-params')
const Client = require('./Client');

class Config {
    constructor(self) {
        this.self = self;
    }
    async get(key, options = {}) {
        if (key && typeof key === 'object') {
            options = key
            key = null
        }
        const url = key ? 'config' : 'config/show'

        const data = (await axios.post(this.self._craftURL(`/api/v0/${url}`), {}, {
            params: toUrlSearchParams({
                arg: key,
                ...options
            }),
            headers: options.headers
        })).data

        return key ? data.Value : data
    }
    async set(key, value, options = {}) {
        if (typeof key !== 'string') {
            throw new Error('Invalid key type')
        }

        const params = {
            arg: [
                key,
                value
            ],
            ...options
        }

        if (typeof value === 'boolean') {
            params.arg[1] = value.toString()
            params.bool = true
        } else if (typeof value !== 'string') {
            params.arg[1] = JSON.stringify(value)
            params.json = true
        }

        const res = (await axios.post(this.self._craftURL("/api/v0/config"), {}, {
            params: toUrlSearchParams(params),
            headers: options.headers
        })).data

        return res
    }
}

class HTTPClient extends Client {
    constructor(apiAddr) {
        super();
        if(!apiAddr) {
            throw "'apiAddr' is a required argument.";
        }
        if (typeof apiAddr === "string") {
            this.apiAddr = multiaddr(apiAddr);
            //this.apiAddr = apiAddr;
        } else {
            /**
             * @type {multiaddr}
             */
            this.apiAddr = apiAddr;
        }
        this.config = new Config(this);
        this.self = this;
    }
    _craftURL(path) {
        var nodeAddress = this.apiAddr.nodeAddress();
        var url = `http://${nodeAddress.address}:${nodeAddress.port}`;
        if (path[0] === "/") {
            return `${url}${path}`;
        } else {
            return `${url}/${path}`;
        }
    }
}
module.exports = HTTPClient