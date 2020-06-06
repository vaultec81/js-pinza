const Cluster = require('./Cluster');
const OrbitDBAddress = require('orbit-db/src/orbit-db-address')
const ErrorCodes = require('../core/ErrorCodes');

class Client {
    constructor(self) {
        this.self = self;

        this.clusterHandlers = {};
    }
    /**
     * Returns a cluster instance
     * @param {String} name
     * @returns {Promise<Cluster>} 
     */
    async cluster(name) {
        if(this.clusterHandlers[name]) {
            return this.clusterHandlers[name];
        }
        var clusterStatus = await this.clusterStatus(name);
        if(!clusterStatus.exists) {
            var err = new Error('Cluster does not exist')
            err.code = ErrorCodes.ERR_Cluster_does_not_exist;
            throw err;
        }
        if(clusterStatus.open) {
            this.clusterHandlers[name] = new Cluster(this.self, name);
            return this.clusterHandlers[name];
        } else {
            var err = new Error('Cluster is not open')
            err.code = ErrorCodes.ERR_Cluster_not_open;
            throw err;
        }
    }
    /**
     * Creates a new cluster
     * @param {String} name 
     * @param {{overwrite:Boolean}} options 
     * @returns {Promise<Cluster>} returns a cluster handler instance.
     */
    async createCluster(name, options) {
        if(!options.overwrite) {
            //Overwriting is not recommeded. However, support is still available.
            options.overwrite = false;
        }
        var response = (await axios.post(this.self._craftURL("/api/v0/cluster/create"), {
            name,
            options
        })).data;
        if(response.err) {
            var err = new Error(response.err.message);
            err.code = response.err.code;
            throw err;
        }
        return new Cluster(this.self, name);
    }
    /**
     * Opens a cluster instance. 
     * @param {String} name 
     * @param {{create:Boolean}} options 
     */
    async openCluster(name, options) {
        if(!options.create) {
            options.create = false;
        }
        var response = (await axios.post(this.self._craftURL("/api/v0/cluster/open"), {
            name,
            options
        })).data;
        if(response.err) {
            var err = new Error(response.err.message);
            err.code = response.err.code;
            throw err;
        }
        return new Cluster(this.self, name);
    }
    /**
     * leaves cluster and defaultly removes all associated data. 
     * @param {String} name 
     * @param {{clearData:Boolean}} options 
     */
    async leaveCluster(name, options) {
        if(!options.clearData) {
            options.clearData = true
        }
        var response = (await axios.post(this.self._craftURL("/api/v0/cluster/leave"), {
            name,
            options
        })).data;
        if(response.err) {
            var err = new Error(response.err.message);
            err.code = response.err.code;
            throw err;
        }
    }
    /**
     * Joins a pinza cluster. 
     * Data present on cluster will be eventually synced to this node depending on cluster settings.
     * @param {String} name 
     * @param {String} address 
     * @param {{start:Boolean, overwrite:Boolean}} options
     */
    async joinCluster(name, address, options) {
        OrbitDBAddress.parse(address); //Throws error if address is invalid.
        if(!options.start) {
            options.start = true;
        }
        if(!options.overwrite) {
            //Overwriting is not recommeded. However, support is still available.
            options.overwrite = false;
        }
        var response = (await axios.post(this.self._craftURL("/api/v0/cluster/join"), {
            name,
            address,
            options
        })).data;
        if(response.err) {
            var err = new Error(response.err.message);
            err.code = response.err.code;
            throw err;
        }
        return response.payload;
    }
    /**
     * Closes cluster.
     * @param {String} name 
     * @returns {Promise}
     */
    async closeCluster(name) {
        var response = (await axios.post(this.self._craftURL("/api/v0/cluster/close"), {
            name
        })).data;
        if(response.err) {
            var err = new Error(response.err.message);
            err.code = response.err.code;
            throw err;
        }
        delete this.clusterHandlers[name];
        return response.payload;
    }
    /**
     * Lists clusters tracked by this node.
     * @param {{asArray:Boolean}} options
     * @returns {Promise{}}
     */
    async listClusters(options) { 
        if(!options.asArray) {
            options.asArray = true;
        }
        var clusters = this.config.get("clusters")
        if(options.asArray) {
            var out = [];
            for(var clusterName in clusters) {
                var cluster = clusters[clusterName];
                cluster.name = clusterName
                out.push(cluster)
            }
            return out;
        } else {
            return clusters;
        }
    }
    /**
     * Renames a cluster
     * Warning: May have unintended consequences. Like broken client connections.
     * @param {String} oldname 
     * @param {String} newName 
     */
    async renameCluster(oldname, newName) { 
        //TODO: Implementation
    }
    /**
     * Retrieve status of cluster. exists, open.
     * @param {String} name 
     */
    async clusterStatus(name) {
        var response = (await axios.post(this.self._craftURL("/api/v0/cluster/status"), {
            name
        })).data;
        if(response.err) {
            var err = new Error(response.err.message);
            err.code = response.err.code;
            throw err;
        }
        return response.payload;
    }
}
module.exports = Client