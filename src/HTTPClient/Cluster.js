const CID = require('cids');
const axios = require('axios');
const dagCbor = require('ipld-dag-cbor')

class Pin {
    constructor(self, name) {
        this.self = self;
        this.name = name;
    }
    async add(cid, meta = {}, options) {
        new CID(cid); //Throw error if cid is invalid;
        var result = (await axios.post(this.self._craftURL("/api/v0/cluster/pin/add"), {
            cid: cid.toString(),
            meta,
            options,
            cluster: this.name
        })).data;
        if(result.err) {
            var err = new Error(result.err.message);
            err.code = result.err.code;
            throw err;
        }
        return result;
    }
    async rm(cid, options) {
        var result = (await axios.post(this.self._craftURL("/api/v0/cluster/pin/rm"), {
            cid: cid.toString(),
            options,
            cluster: this.name
        })).data;
        if(result.err) {
            var err = new Error(result.err.message);
            err.code = result.err.code;
            throw err;
        }
        return result;
    }
    async ls(options) {
        var result = (await axios.post(this.self._craftURL("/api/v0/cluster/pin/ls"), {
            options,
            cluster: this.name
        })).data;
        if(result.err) {
            var err = new Error(result.err.message);
            err.code = result.err.code;
            throw err;
        }
        return result;
    }
    async currentCommitment() {
        var result = (await axios.post(this.self._craftURL("/api/v0/cluster/pin/commitment"), {
            cluster: this.name
        })).data;
        if(result.err) {
            var err = new Error(result.err.message);
            err.code = result.err.code;
            throw err;
        }
        return result;
    }
}

/**
 * HTTP Client cluster virtual handler.
 */
class Cluster {
    constructor(self, name) {
        this.self = self;
        this.name = name;
        this.Pin = new Pin(self, name);
    }
    /**
     * Exports entire pinset
     * @param {{format:String}} options 
     */
    async export(options = {}) {
        options.format = "raw"; //Inorder for the result to be sent correctly
        var result = (await axios.post(this.self._craftURL("/api/v0/cluster/export"), {
            cluster: this.name,
            options
        })).data;
        if(result.err) {
            var err = new Error(result.err.message);
            err.code = result.err.code;
            throw err;
        }
        return result;
    }
    /**
     * Imports pinset to cluster
     * @param {*} in_object 
     * @param {{format:String, clear:Boolean}} options 
     */
    async import(in_object, options = {}) {
        if(!options.format) {
            options.format = "raw"
        }
        let input;
        if(options.format === "raw") {
            input = in_object;
        } else if(options.format === "cbor") {
            input = dagCbor.util.deserialize(in_obj);
        } else if(options.format === "json") {
            input = JSON.parse(in_object);
        }
        options.format = "raw"; //Pass correct options through HTTP API.

        var result = (await axios.post(this.self._craftURL("/api/v0/cluster/import"), {
            cluster: this.name,
            options,
            input
        })).data;
        if(result.err) {
            var err = new Error(result.err.message);
            err.code = result.err.code;
            throw err;
        }
        return result;
    }
}
module.exports = Cluster;