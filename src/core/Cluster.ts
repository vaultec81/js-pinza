import PQueue from 'p-queue'
import kBucket from 'k-bucket'
import {Key} from 'interface-datastore'
import multihash from 'multihashes'
import CID from 'cids'
import dagCbor from 'ipld-dag-cbor'
import ErrorCodes from './ErrorCodes'
import Components from './Components'
import { CodedException } from "./Errors.model";
var debug = require('debug')('pinza:cluster');

/**
 * Pinza file health management system
 * Health is a metric of how many nodes on the Pinza cluster is actively storing the data.
 */
class Health {
    constructor(cluster) {

    }
    async get(cid) {

    }
}
class Pin {
    opQueue: any;
    cluster: any;
    db: any;
    /**
     * 
     * @param {cluster} pinza 
     */
    constructor(cluster) {
        this.cluster = cluster;
        this.opQueue = new PQueue({ concurrency: 1 });
        this.db = cluster.db;
    }
    /**
     * Pins CID to cluster
     * @param {CID|String} cid 
     * @param {Object} meta 
     * @param {{bypass}} options 
     */
    async add(cid, meta = {}, options: {
        bypass?: boolean
    } = {}) {
        if (!options.bypass) {
            options.bypass = false;
        }
        cid = new CID(cid);
        var record = await this.db.findOne({
            cid: cid.toString()
        })
        if (record && options.bypass === false) {
            var err = new Error(`Pin with cid of ${cid.toString()} already exists`) as CodedException
            err.code = ErrorCodes.ERR_Pin_already_exists;
            throw err;
        }
        try {
            await this.db.insertOne({
                meta,
                cid: cid.toString(),
                type: "ipfs"
            })
        } catch (err1) {
            if(!err1.message.includes("Error: Could not append entry")) {
                var err = new Error(err1.message) as CodedException;
                err.code = ErrorCodes.ERR_write_denied
                throw err;
            }
            throw err1;
        }
    }
    /**
     * Remove CID from cluster
     * @param {CID|String} cid 
     * @param {*} options 
     */
    async rm(cid, options) {
        //cid = new CID(cid);
        var curEntry = await this.db.findOne({
            cid: cid.toString()
        })
        if(!curEntry) {
            var err = new Error("Pin does not exist") as CodedException;
            err.code = ErrorCodes.ERR_Pin_does_not_exist;
            throw err;
        }
        try {
            await this.db.findOneAndDelete({
                cid: cid.toString()
            })
        } catch (err1) {
            if(!err1.message.includes("Error: Could not append entry")) {
                var err = new Error(err1.message) as CodedException;
                err.code = ErrorCodes.ERR_write_denied
                throw err;
            }
            throw err1;
        }
    }
    /**
     * Checks whether a CID is pinned to the cluster
     * @param {CID|String}
     * @returns {Boolean}
     */
    async has(cid) {
        cid = new CID(cid);
        var result = await this.db.findOne({
            cid: cid.toString()
        })
        if (result) {
            return true;
        } else {
            return false;
        }
    }
    /**
     * Private pinning method
     * @param {CID|String} cid
     */
    async _add(cid) {
        debug(`pinning ${cid} to ipfs`)
        try {
            await this.cluster._ipfs.pin.add(cid);
        } catch (err) {
            console.log(err)
            return
        }
        var object_info = await this.cluster._ipfs.object.stat(cid)
        delete object_info.Hash
        await this.cluster.datastore.put(`/commited/${cid}`, dagCbor.util.serialize({
            stat: object_info
        }))
    }
    /**
     * Private unpinning method
     * @param {CID|String} cid 
     */
    async _rm(cid) {
        try {
            await this.cluster._ipfs.pin.rm(cid);
        } catch {
            
        }
    }
    /**
     * Retrieves the current pin commitment for this node
     * @returns {Promise<any>}
     */
    async currentCommitment() {
        var out = {};
        for await (var entry of this.cluster.datastore.query({ prefix: "/commited" })) {
            const { key, value } = entry;
            if (value.length !== 0) {
                out[key.baseNamespace()] = dagCbor.util.deserialize(value)
            } else {
                out[key.baseNamespace()] = {};
            }
        }
        return out;
    }
    /**
     * Sets the pin commitment. Calcuation metric for allocating commitment can be any abstract system.
     * This shouldn't need to be called normally. Called by default sharding system.
     * @param {CID[]} commitment 
     */
    async setCommitment(commitment) {
        var currentCommitment = await this.currentCommitment() as any
        for (var pin of commitment) {
            if (!currentCommitment[pin.toString()]) {
                await this.cluster.datastore.put(`/commited/${pin}`, "")
                debug(`adding ${pin} to pinning queue`)
                this.opQueue.add(async () => await this._add(pin))
            }
        }
        /*for (var pin in currentCommitment) {
            if (!commitment.includes(pin.toString())) {
                debug(`removing ${pin} from commitment`)
                await this.cluster.datastore.delete(`/commited/${pin}`)
                this.opQueue.add(async () => await this._rm(pin))
            }
        }*/
    }
    /**
     * Checks whether a CID has been commited to this node.
     * @param {CID|String} cid 
     * @returns {Boolean}
     */
    async hasCommit(cid) {
        var digest = new CID(cid).multihash;
        var result = false;
        for await (var entry of this.cluster.datastore.query({ prefix: "/commited" })) {
            const { key, value } = entry;
            if (key.baseNamespace() === digest.toString()) {
                result = true;
            }
        }
        return result;
    }
    /**
     * Lists CIDs that have been imported into this node.
     * @param {{size:Boolean, meta: Object}} options
     * @returns {Promise<[]>}
     */
    async ls(options: {
        size?: boolean,
        meta?: Object
    } = {}) {
        if (!options.size) {
            options.size = false;
        }
        var query: {
            meta?: Object
        } = {};
        if(options.meta) {
            query.meta = options.meta;
        }
        var pins = [];
        for (var e of await this.db.find(query)) {
            delete e._id
            if (options.size) {
                var stat = await this.cluster._ipfs.object.stat(e.cid);
                e.size = stat.CumulativeSize
            }
            pins.push(e)
        }
        return pins;
    }
    async start() {
        setInterval( async() => {
            for await (var entry of this.cluster.datastore.query({ pattern: "/commited", keysOnly: true })) {
                const { key, value } = entry;
                var cid = key.baseNamespace()
                try {
                    for await(var e of this.cluster._ipfs.pin.ls(cid, {
                        type:"recursive"
                    })) {}
                } catch  {
                    debug(`Pinning CID that wasn't detected in IPFS's pin list; CID is ${cid}`)
                    this._add(cid)
                }
            }
        }, 15 * 60 * 1000) //Run pin check cycle every 15 minutes
    }
    async stop() {
        this.opQueue.pause()
        this.opQueue.clear()
    }
}
export class Sharding {
    datastore: any;
    options:  {nodeId: string};
    bucket: any;
    constructor(datastore, options = {}) {
        this.datastore = datastore;
        this.options = options as  {nodeId: string};

        var { nodeId } = this.options;
        if (nodeId) {
            this.bucket = new kBucket({
                localNodeId: multihash.decode(multihash.fromB58String(nodeId)).digest,
                numberOfNodesPerKBucket: 500
            });
        } else {
            this.bucket = new kBucket({
                numberOfNodesPerKBucket: 500
            });
        }
    }
    /**
     * Adds CID disk datastore for tracking
     * @param {CID|String} ipfsHash 
     */
    async add(ipfsHash) {
        var cid = (new CID(ipfsHash)).toString();
        this._add(ipfsHash);
        if (!(await this.datastore.has(new Key(`pins/${cid}`)))) {
            debug(`Adding new ipfsHash to datastore: ${cid}`);
            await this.datastore.put(new Key(`pins/${cid}`), "");
        }
    }
    /**
     * Adds CID to Sharding k-bucket
     * @param {CID|String} ipfsHash 
     */
    _add(ipfsHash) {
        try {
            ipfsHash = (new CID(ipfsHash)).multihash
        } catch (ex) {
            return;
        }
        var mhash = multihash.decode(ipfsHash)
        this.bucket.add({
            id: mhash.digest,
            ipfsHash
        })
    }
    /**
     * Removes CID from localstore
     * @param {CID} ipfsHash 
     * @returns {Promies<null>}
     */
    async del(ipfsHash) {
        var mhash = multihash.decode(ipfsHash)
        this.bucket.remove(mhash.digest);
        await this.datastore.del(new Key(`pins/${mhash.toString()}`), "");
    }
    /**
     * Resets in memory k-bucket. 
     * This shouldn't need to be called normally. Used when pins is being updated.
     */
    reset() {
        delete this.bucket;
        var { nodeId } = this.options;
        if (nodeId) {
            this.bucket = new kBucket({
                localNodeId: multihash.decode(multihash.fromB58String(nodeId)).digest,
                numberOfNodesPerKBucket: 500
            });
        } else {
            this.bucket = new kBucket({
                numberOfNodesPerKBucket: 500
            });
        }
    }
    /**
     * Returns list of CIDs this node is responsible in storing.
     * @param {Number} replication_factor 
     * @param {Number} nNodes
     * @returns {CID[]}
     */
    myCommitment(replication_factor = 1, nNodes = 1) {
        var count = this.count();
        var allocated = Math.round((count / nNodes) * replication_factor);
        if (allocated === 0) {
            allocated = 1;
        }
        var out = [];
        for (var pin of this.bucket.closest(this.bucket.localNodeId, allocated)) {
            out.push(multihash.toB58String(pin.ipfsHash))
        }
        return out;
    }
    /**
     * Returns total size of bucket
     * @returns {Number}
     */
    count() {
        return this.bucket.count()
    }
    async start() {
        debug("loading datastore")
        for await (var entry of this.datastore.query({ pattern: "/pins", keysOnly: true })) {
            const { key, value } = entry;
            this._add(key.baseNamespace())
        }
    }
    async stop() {

    }
}
export class Cluster {
    private _ipfs: any;
    db: any;
    config: any;
    datastore: any;
    pin: Pin;
    sharding: Sharding;
    access: any;
    reindex_pid: NodeJS.Timer;
    /**
     * Pinza cluster constructor
     * @param {*} ipfs 
     * @param {} db 
     * @param {*} config 
     * @param {InterfaceDatastore.MemoryDatastore} datastore 
     */
    constructor(ipfs, db, config, datastore) {
        this._ipfs = ipfs;

        this.db = db;
        this.config = config;
        this.datastore = datastore;
        this.pin = new Pin(this);
        this.sharding = new Sharding(datastore);
        this.access = new Components.Access(this)
    }
    /**
     * Returns OrbitDB ID of this cluster
     */
    get id() {
        return this.db.address;
    }
    /**
     * Returns String version of OrbitDB ID of this cluster
     * @returns {String}
     */
    get address() {
        return this.db.address.toString()
    }
    /**
     * Exports entire pinset
     * @param {{format:String}} options 
     */
    async export(options: {format?: string} = {}) {
        if (!options.format) {
            options.format = "raw"
            //options.format = "cbor"
            //options.format = "json"
        }
        var pins = await this.db.find({});
        pins.forEach(e => {
            delete e._id
        })
        var out = {
            pins,
            size: pins.length
        }
        if (options.format === "json") {
            return JSON.stringify(out)
        } else if (options.format === "cbor") {
            return dagCbor.util.serialize(out)
        } else if (options.format === "raw") {
            return out;
        }
    }
    /**
     * Imports pinset to cluster
     * @param {*} in_object 
     * @param {{format:String, clear:Boolean}} options 
     */
    async import(in_object, options: {
        progressHandler?: Function,
        format?: string,
        clear?: boolean
    } = {}) {
        var { progressHandler } = options;
        if (!options.format) {
            options.format = "raw"
            //options.format = "json"
            //options.format = "cbor"
        }
        if (options.format === "json") {
            in_object = JSON.parse(in_object)
        } else if (options.format === "cbor") {
            in_object = dagCbor.util.deserialize(in_object)
        } else if (options.format === "raw") {

        }
        if (options.clear === true) {
            //TODO proper system to drop the collection using what is defined in aviondb.
            //await this.db.drop()
        }
        var totalDone = 0;
        for (var pin of in_object.pins) {
            var { cid, meta } = pin;
            await this.pin.add(cid, meta, { bypass: true })
            totalDone++;
            if (progressHandler) {
                progressHandler(totalDone, in_object.size)
            }
        }
    }
    async start() {
        await this.pin.start()
        await this.sharding.start();

        //Reindex every 60 seconds
        this.reindex_pid = setInterval(async () => {
            debug(`Querying datastore for changes`);
            var result = await this.db.distinct("cid")
            this.sharding.reset()
            result.forEach(item => {
                this.sharding.add(item)
            })
            this.pin.setCommitment(this.sharding.myCommitment())
        }, 60000);
    }
    async stop() {
        this.pin.stop();
        await this.db.close();
        clearInterval(this.reindex_pid)
        await this.sharding.stop()
    }
    async init() {
        //Later use
    }
    static async open(ipfs, orbitdb, address) {

    }
}

