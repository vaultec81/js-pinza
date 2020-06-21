const Orbitdb = require('orbit-db');
const Cluster = require('./Cluster')
const mergeOptions = require('merge-options')
const EnvironmentAdapter = require('./EnvironmentAdapter')
const Components = require('./Components')
const Path = require('path')
var debug = require('debug')('pinza:client');
const AvionDb = require('aviondb'); //Keep Import to add aviondb to orbitdb class; TODO remove work around
const LevelDb = require('datastore-level');
const EventEmitter = require('events');
const fs = require('fs');
const ErrorCodes = require('./ErrorCodes');
try {
    Orbitdb.addDatabaseType("aviondb.collection", require('aviondb/src/core/Collection'))
} catch {

}

class client {
    constructor(ipfs, options = {}) {
        this._ipfs = ipfs;
        this._orbitdb = null;
        this._ready = false;

        this.openClusters = {}

        const defaults = {
            path: EnvironmentAdapter.repoPath()
        };
        this._options = mergeOptions(defaults, options);
        this.config = new Components.Config(EnvironmentAdapter.datastore(this._options.path));
        this.events = new EventEmitter();
    }
    /**
     * Returns instance of cluster if open. throws error if cluster is not opne.
     * @param {String} name
     * @returns {Cluster}
     */
    cluster(name) {
        if(!this.openClusters[name]) {
            var err = new Error("Cluster not opened")
            err.code = ErrorCodes.ERR_Cluster_not_open;
            throw err;
        } else {
            return this.openClusters[name];
        }
    }
    /**
     * Joins a pinza cluster. 
     * Data present on cluster will be eventually synced to this node depending on cluster settings.
     * @param {String} name 
     * @param {String} address 
     * @param {{start:Boolean, overwrite:Boolean}} options
     * @returns {Promise<null>}
     */
    async joinCluster(name, address, options = {}) {
        if(!options.start) {
            options.start = true;
        }
        if(!options.overwrite) {
            //Overwriting is not recommeded. However, support is still available.
            options.overwrite = false;
        }
        var clusters = await this.listClusters({asArray: false});
        if(clusters[name] && options.overwrite !== true) {
            var err = new Error(`Cluster already exists with name of ${name}`);
            err.code = ErrorCodes.ERR_Cluster_already_exists;
            throw err;
        } else if(clusters[name]) {
            //Make sure cluster is not already open.
            if(this.openClusters[name]) {
                await this.openClusters[name].stop();
            }
            delete this.openClusters[name];
        }
        for(var cluster of Object.values(clusters)) {
            if(cluster.address === address) {
                var err = new Error(`Cluster already exists with same address`);
                err.code = ErrorCodes.ERR_Cluster_already_exists;
                throw err;
            }
        }
        //TODO: pull settings directly from other peers.
        this.config.set(`clusters.${name}`, Object.assign({
            address: address.toString()
        }, this.config.get("defaultClusterConfig")))
        if(this.config.get("defaultCluster") === "") {
            this.config.set("defaultCluster", name)
        }
        if(options.start) {
            await this.openCluster(name);
        }
    }
    /**
     * leaves cluster and defaultly removes all associated data. 
     * @param {String} name 
     * @param {{clearData:Boolean}} options 
     */
    async leaveCluster(name, options = {}) {
        if(!options.clearData) {
            options.clearData = true
        }        
        var cluster_info = this.config.get(`clusters.${name}`);
        debug(`Leaving cluster with address of ${cluster_info.address}`)
        if(options.clearData === true) {
            var cluster = await this.openCluster(name); //Make sure cluster is open to begin with.
            var commitment = await cluster.pin.currentCommitment();
            for(var pin in commitment) {
                await cluster.pin._rm(pin)
            }
            await cluster.stop();
        }
        this.config.set(`clusters.${name}`, undefined); //Remove from config file
    }
    /**
     * Creates a new cluster
     * @param {String} name 
     * @param {{overwrite:Boolean}} options 
     * @returns {Promise<Cluster>} Cluster instance
     */
    async createCluster(name, options = {}) {
        if(!options.overwrite) {
            options.overwrite = false;
        }
        if(this.config.get(`clusters.${name}`) && options.overwrite !== true) {
            var err = new Error("Cluster already exists");
            err.code = ErrorCodes.ERR_Cluster_already_exists;
            throw err;
        }
        if(!name) {
            var err = new Error("Name is a required argument");
            err.code = ErrorCodes.ERR_missing_args;
            throw err;
        }
        var db = await this._orbitdb.create(name, "aviondb.collection", {
            overwrite: true,
            accessController: {
                write: [
                    this._orbitdb.identity.id //Only allow writes from this node until symmetric key authentication can be used. Or add access dynamically through orbitdb AC
                ]
            }
        });
        db._orbitdb = this._orbitdb

        debug(`Creating cluster with ID of ${db.address.toString()}`)
        var cluster = new Cluster(this._ipfs, db, this.config.child(`clusters.${db.address.path}`),
            new LevelDb(Path.join(this._options.path, "clusters", db.address.root)));
        await cluster.start();

        this.openClusters[name] = cluster;

        //Add cluster to config with default cluster settings
        this.config.set(`clusters.${name}`, Object.assign({
            address: db.address.toString()
        },this.config.get("defaultClusterConfig")))

        if(this.config.get("defaultCluster") === "") {
            this.config.set("defaultCluster", name)
        }

        return cluster;
    }
    /**
     * Opens a cluster instance. 
     * @param {String} name name of cluster
     * @param {{create:Boolean}} options 
     * @returns {Promise<Cluster>} Cluster instance
     */
    async openCluster(name, options = {}) {
        if(!options.create) {
            options.create = false;
        }
        if(this.openClusters[name]) {
            return this.openClusters[name]
        }
        var cluster_info = this.config.get(`clusters.${name}`);

        if(!cluster_info && options.create !== true) {
            var err = new Error(`Cluster with name of ${name} does not exist`);
            err.code = ErrorCodes.ERR_Cluster_does_not_exist;
            throw err;
        } else if(options.create === true) {
            return await this.createCluster(name, options)
        }
        var db = await this._orbitdb.open(cluster_info.address);
        db._orbitdb = this._orbitdb;

        await db.load();
        
        debug(`Opening cluster with ID of ${db.address.toString()}`)
        var cluster = new Cluster(this._ipfs, db, this.config.child(`clusters.${db.address.path}`),
            new LevelDb(Path.join(this._options.path, "clusters", db.address.root)));
        await cluster.start();
        this.openClusters[name] = cluster;
        return cluster;
    }
    /**
     * Lists clusters tracked by this node.
     * @param {{asArray:Boolean}} options
     * @returns {Promise{}}
     */
    async listClusters(options = {}) {
        if(!options.asArray) {
            options.asArray = true;
        }
        var clusters = this.config.get("clusters")
        if(options.asArray) {
            var out = [];
            for(var clusterName in clusters) {
                const cluster = clusters[clusterName];
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
        var cluster_info = this.config.get(oldname)
        if(cluster_info) {
            this.config.set(newName, cluster_info);
        } else {
            var err = new Error("cluster not found")
            err.code = ErrorCodes.ERR_Cluster_does_not_exist;
            throw err;
        }
        
        if(this.openClusters[oldname]) {
            this.openClusters[newName] = this.openClusters[oldname];
        }
    }
    async closeCluster(name) {
        if(!this.openClusters[name]) {
            var err = new Error("Cluster is not open");
            err.code = ErrorCodes.ERR_Cluster_not_open;
            throw err;
        }
        await this.openClusters[name].stop();
        delete this.openClusters[name];
    }
    /**
     * Returns information whether a cluster is open or not, exists or not.
     * @param {String} name 
     */
    async clusterStatus(name) {
        let exists;
        let open;
        
        if(this.config.get(`clusters.${name}`)) {
            exists = true;
        } else {
            exists = false,
            open = false;
        }
        if(exists) {
            if(this.openClusters[name]) {
                open = true;
            } else {
                open = false;
            }
        }
        return {
            exists, 
            open
        }
    }
    /**
     * Initalizes repo and configuration
     */
    async init() {
        if(fs.existsSync(this._options.path)) {
            var error = new Error("Repo already initialized");
            error.code = ErrorCodes.ERR_repo_already_initialized;
            throw error;
        }
        fs.mkdirSync(this._options.path)
        fs.mkdirSync(Path.join(this._options.path), "clusters")
        await this.config.init();
    }
    /**
     * Starts client, orbitdb.
     * Loads and starts clusters into memory.
     */
    async start() {
        if(!fs.existsSync(this._options.path)) {
            var error = new Error("Repo not initialized");
            error.code = ErrorCodes.ERR_repo_not_initialized;
            throw error;
        }
        //Using file based repo lock as any other system is not neccessary for now.
        if(fs.existsSync(Path.join(this._options.path, "repo.lock"))) {
            var error = new Error("repo.lock exists, daemon may be already running");
            error.code = ErrorCodes.ERR_repo_locked;
            throw error;
        }
        fs.writeFileSync(Path.join(this._options.path, "repo.lock"), "");
        try {
            await this.config.open()
            this._orbitdb = await Orbitdb.createInstance(this._ipfs, {
                directory: Path.join(this._options.path, "orbitdb")
            });
            var clusters = this.config.get("clusters");
            for (var cluster_name in clusters) {
                debug(`opening cluster: ${cluster_name}`)
                this.openClusters[cluster_name] = await this.openCluster(cluster_name)
            }
        } catch(err) {
            fs.unlinkSync(Path.join(this._options.path, "repo.lock"));
            throw err;
        }
    }
    /**
     * Stops client, orbitdb.
     * stops, and unloads clusters from memory.
     */
    async stop() {
        debug(`Stopping`)
        for(var cluster of Object.values(this.openClusters)) {
            await cluster.stop();
        }
        await this._orbitdb.stop()
        fs.unlinkSync(Path.join(this._options.path, "repo.lock"));
    }
}
module.exports = client;