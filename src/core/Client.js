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

class client {
    constructor(ipfs, options) {
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
            throw "Cluster not opened"
        } else {
            return this.openClusters[name];
        }
    }
    /**
     * Joins a pinza cluster. 
     * Data present on cluster will be eventually synced to this node depending on cluster settings.
     * @param {String} name 
     * @param {String} address 
     * @returns {Promise<null>}
     */
    async joinCluster(name, address) {
        var clusters = await this.listClusters();
        if(clusters[name]) {
            throw `Cluster already exists with name of ${name}`;
        }
        //TODO: pull settings directly from other peers.
        this.config.set(`clusters.${name}`, Object.assign({
            address: address.toString()
        },this.config.set.cluster.get("defaultClusterConfig")))
        await this.openCluster(name);
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
            throw "Cluster already exists"
        }
        if(!name) {
            throw "Name is a required argument"
        }
        var db = await this._orbitdb.create(name, "aviondb", {
            overwrite: true,
            accessController: {
                write: [
                    this._orbitdb.identity.id //Only allow writes from this node until symmetric key authentication can be used. Or add access dynamically through orbitdb AC
                ]
            }
        });
        db._orbitdb = this._orbitdb

        await db.createCollection("pins", {
            overwrite: true
        });
        debug(`Creating cluster with ID of ${db.address.toString()}`)
        var cluster = new Cluster(this._ipfs, db, this.config.child(`clusters.${db.address.path}`),
            new LevelDb(Path.join(this._options.path, "clusters", db.address.root)));
        await cluster.start();

        //Add cluster to config with default cluster settings
        this.config.set(`clusters.${name}`, Object.assign({
            address: db.address.toString()
        },this.config.get("defaultClusterConfig")))

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
            throw `Cluster with name of ${name} does not exist`;
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
     * @returns {Promise{}}
     */
    async listClusters() {
        return this.config.get("clusters")
    }
    /**
     * Initalizes repo and configuration
     */
    async init() {
        await this.config.init()
    }
    /**
     * Starts client, orbitdb.
     * Loads and starts clusters into memory.
     */
    async start() {
        await this.config.open()
        this._orbitdb = await Orbitdb.createInstance(this._ipfs, {
            directory: Path.join(this._options.path, "orbitdb")
        });
        var clusters = this.config.get("clusters");
        for (var cluster_name in clusters) {
            debug(`opening cluster: ${cluster_name}`)
            this.openClusters[cluster_name] = await this.openCluster(cluster_name)
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
    }
}
module.exports = client;