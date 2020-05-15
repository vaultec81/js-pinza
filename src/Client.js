const Orbitdb = require('orbit-db');
const Cluster = require('./Cluster')
const mergeOptions = require('merge-options')
const EnvironmentAdapter = require('./EnvironmentAdapter')
const Components = require('./Components')
const Path = require('path')
var debug = require('debug')('pinza:client');
const AvionDb = require('aviondb'); //Keep Import to add aviondb to orbitdb class; TODO remove work around
const LevelDb = require('datastore-level');
const EventEmitter = require('events')


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
    cluster(name) {
        if(!this.openClusters[name]) {
            throw "Cluster not opened"
        } else {
            return this.openClusters[name];
        }
    }
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
    async createCluster(name, options = {}) {
        var db = await this._orbitdb.create(name, "aviondb", {
            overwrite: true,
            type: "orbitdb",
            accessController: {
                write: [
                    this._orbitdb.identity //Only allow writes from this node until symmetric key authentication can be used.
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
    async openCluster(name, options = {}) {
        if(this.openClusters[name]) {
            return this.openClusters[name]
        }
        var cluster_info = this.config.get(`clusters.${name}`);

        if(!cluster_info) {
            throw `Cluster with name of ${name} does not exist`;
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
    async listClusters() {
        return this.config.get("clusters")
    }
    async init() {
        await this.config.init()
    }
    async start() {
        await this.config.open()
        this._orbitdb = await Orbitdb.createInstance(this._ipfs, {
            directory: Path.join(this._options.path, "orbitdb")
        });
        var clusters = this.config.get("clusters");
        for (var cluster_name in clusters) {
            this.openClusters[cluster_name] = await this.openCluster(cluster_name)
        }
    }
    async stop() {
        for(var cluster of Object.values(this.openClusters)) {
            await cluster.stop();
        }
        await this._orbitdb.stop()
    }
}
module.exports = client;