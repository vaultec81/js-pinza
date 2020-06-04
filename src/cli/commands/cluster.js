
'use strict'

const os = require('os')
const fs = require('fs')
//const toUri = require('multiaddr-to-uri')
const { getRepoPath } = require('../utils')
const debug = require('debug')('pinza:cli:cluster')
const axios = require('axios')
const AsciiTable = require('ascii-table')
const PrettyBytes = require('pretty-bytes')
const DagCbor = require('ipld-dag-cbor')

var myCommitment = {
    command: 'commitment',

    describe: 'prints out a list of CIDs commited to this node',

    builder: {
        cluster: {
            type: 'string',
            describe: "name of cluster"
        }
    },

    async handler(argv) {
        const { print, pinza } = argv.ctx;
        var { cluster } = argv;

        if (!cluster) {
            cluster = await pinza.config.get("defaultCluster")
            if (cluster === "") {
                print("No default cluster is set")
                return;
            }
        }

        var response = (await axios.post("http://localhost:8001/api/v0/cluster/mycommitment", {
            cluster
        })).data;
        var commitment = Object.values(response.payload);
        if (commitment.length === 0) {
            return
        }
        var table = new AsciiTable(`Commitment (${cluster}) (Total: ${commitment.length})`);
        table.setHeading("CID", "Size");
        for (var hash in response.payload) {
            var obj_info = response.payload[hash]
            var size = 0;
            if (obj_info.stat) {
                size = obj_info.stat.CumulativeSize
            }
            table.addRow(hash, PrettyBytes(size))
        }
        print(table.toString())
    }
}
var create = {
    command: 'create <name>',

    describe: 'Creates a new pinza cluster',

    builder(yargs) {
        return yargs;
    },

    async handler(argv) {
        const { print } = argv.ctx;
        const { name } = argv;

        if (name.includes(".")) {
            print(". Is not permitted in cluster naming")
            return
        }

        var response = (await axios.post("http://localhost:8001/api/v0/cluster/create", {
            name
        })).data;
        var cluster_info = response.payload
        if (response.success !== true) {

        }

        print(`Created cluster with name of ${name} and address of ${cluster_info.address}`)
    }
}

var Export = {
    command: 'export',

    describe: 'Exports pinset',

    builder: {
        'format': {
            type: 'string',
            describe: "Output format",
            default: "json",
            choices: ["json", "cbor"],
            alias: "f"
        },
        out: {
            type: 'string',
            describe: "output destination can be file or stdout.",
            alias: "o",
            default: "-"
        },
        quiet: {
            type: 'boolean',
            alias: 'q',
            default: false,
            describe: "Write minimal output"
        }
    },


    async handler(argv) {
        const { print, pinza } = argv.ctx;
        var { format, out, cluster, quiet } = argv;

        if (!cluster) {
            cluster = await pinza.config.get("defaultCluster")
            if (cluster === "") {
                print("No default cluster is set")
                return;
            }
        }


        if (!quiet) {
            print(`Exporting '${cluster}'`)
        }

        var response = (await axios.post("http://localhost:8001/api/v0/cluster/export", {
            cluster
        })).data;

        var export_data = response.payload
        let export_buffer;
        if (format === "json") {
            export_buffer = JSON.stringify(export_data)
        } else if (format === "cbor") {
            export_buffer = DagCbor.util.serialize(export_data)
        }

        if (out === "-") {
            print(export_buffer)
        } else {
            print(`Writing to '${out}' format is '${format}'`)
            fs.writeFileSync(out, export_buffer)
            print(`Export complete with ${export_data.size} total pins`)
        }
    }
}
var Import = {
    command: 'import',

    describe: 'Imports pinset',

    builder: {
        'format': {
            type: 'string',
            describe: "Output format",
            default: "json",
            choices: ["json", "cbor"],
            alias: "f"
        },
        file: {
            type: 'string',
            describe: "Location of file to import",
            alias: "f",
            required: true
        },
        quiet: {
            type: 'boolean',
            alias: 'q',
            default: false,
            describe: "Write minimal output"
        }
    },


    async handler(argv) {
        const { print, pinza } = argv.ctx;
        var { format, file, cluster, quiet } = argv;

        if (!cluster) {
            cluster = await pinza.config.get("defaultCluster")
            if (cluster === "") {
                print("No default cluster is set")
                return;
            }
        }

        if (!quiet) {
            print(`Importing pinset to '${cluster}' from ${file}`)
        }
        var income_buffer = fs.readFileSync(file);
        let obj_import;
        if (format === "json") {
            obj_import = JSON.parse(income_buffer.toString())
        } else if (format === "cbor") {
            obj_import = DagCbor.util.deserialize(income_buffer);
        }


        var response = (await axios.post("http://localhost:8001/api/v0/cluster/import", {
            cluster,
            input: obj_import
        })).data;
    }
}

var pinadd = {
    command: 'add <cid>',

    describe: 'Adds a IPFS File to cluster',

    builder: {

    },

    async handler(argv) {
        const { print, pinza } = argv.ctx;
        var { cid, cluster } = argv;

        if (!cluster) {
            cluster = await pinza.config.get("defaultCluster")
            if (cluster === "") {
                print("No default cluster is set")
                return;
            }
        }

        var response = (await axios.post("http://localhost:8001/api/v0/cluster/pin/add", {
            cluster,
            cid
        })).data;
        if (response.success === true) {
            print(`Pinned ${cid} to cluster`);
        } else {
            print(`Failed to pin ${cid} to cluster`)
        }
    }
}
var pinls = {
    command: 'ls',

    describe: 'Lists pins present in this cluster',

    builder: {
        table: {
            type: 'boolean',
            describe: "Print output as a table. More verbose data.",
            default: false,
            alias: "t"
        },
        size: {
            type: 'boolean',
            describe: "Retrieve size information",
            default: false,
            alias: "s"
        }
    },

    async handler(argv) {
        const { print, pinza } = argv.ctx;
        var { cluster, table, size } = argv;

        if (!cluster) {
            cluster = await pinza.config.get("defaultCluster")
            if (cluster === "") {
                print("No default cluster is set")
                return;
            }
        }

        var response = (await axios.post("http://localhost:8001/api/v0/cluster/pin/ls", {
            cluster,
            options: {
                size
            }
        })).data;
        var pin_data = response.payload
        var totalSize = 0;
        if (table) {
            var asciiTable = new AsciiTable(`Pinset (Total Length: ${pin_data.length})`);
            if (size) {
                asciiTable.setHeading("CID", "Meta", "Size");
            } else {
                asciiTable.setHeading("CID", "Meta");
            }

            for (var pin of pin_data) {
                if (pin.size) {
                    asciiTable.addRow(pin.cid, JSON.stringify(pin.meta), PrettyBytes(pin.size))
                    totalSize = totalSize + pin.size;
                    asciiTable.setTitle(`Pinset (Total Length: ${pin_data.length}) (Total Stored: ${PrettyBytes(totalSize)})`)
                } else {
                    asciiTable.addRow(pin.cid, JSON.stringify(pin.meta))
                }
            }

            print(asciiTable.toString())
        } else {
            for (var pin of pin_data) {
                print(pin.cid)
            }
        }
    }
}
var pin = {
    command: 'pin <command>',

    describe: "Manage pins associated with a pinza cluster",

    builder(yargs) {
        return yargs.command(pinls).command(pinadd)
    }
}
var join = {
    command: 'join <name> <address>',

    describe: "Joins a Pinza cluster. Syncing data to this node from cluster",

    builder(yargs) {
        return yargs;
    },
    async handler(argv) {
        const { print } = argv.ctx;
        const { address, name } = argv;

        var response = (await axios.post("http://localhost:8001/api/v0/cluster/join", {
            address,
            name
        })).data;

        if (response.success === true) {
            print(`Joined cluster with address of ${address} and name of ${name}`);
        } else {
            print(`Failed to join cluster.\nReason: ${response.err.message}`)
        }
    }
}
var leave = {
    command: 'leave <name>',

    describe: "Leaves a Pinza cluster. Removing all data associated with this cluster. There is no guarantee you can rejoin.",

    builder: {
        verify: {
            describe: "Verify you know what you are doing.",
            type: "bool",
            required: true
        }
    },
    async handler(argv) {
        const { print } = argv.ctx;
        const { name } = argv;

        var response = (await axios.post("http://localhost:8001/api/v0/cluster/leave", {
            name
        })).data;

        if (response.success === true) {
            print(`Left cluster with name of "${name}"`);
        } else {
            print(`Failed to leave cluster\n${response.err}`);
        }
    }
}
var create = {
    command: 'create <name>',

    describe: 'Creates a new pinza cluster',

    builder(yargs) {
        return yargs
    },

    async handler(argv) {
        const { print } = argv.ctx;
        const { name } = argv;

        var response = (await axios.post("http://localhost:8001/api/v0/cluster/create", {
            name
        })).data;
        var cluster_data = response.payload;

        if (response.success === true) {
            print(`Created cluster with name of "${name}" and address of ${cluster_data.address}`);
        } else {
            print(`Failed to create cluster\n${JSON.stringify(response.err)}`);
        }
    }
}
var open = {
    command: 'open <name>',

    describe: 'Opens a pinza cluster',

    builder(yargs) {
        return yargs
    },

    async handler(argv) {
        const { print } = argv.ctx;
        const { name } = argv;
        var response = (await axios.post("http://localhost:8001/api/v0/cluster/create", {
            name
        })).data;

        if (response.success === true) {
            print(`Opened cluster with name of "${name}"`);
        } else {
            print(`Failed to open cluster\n ${JSON.stringify(response.err)}`);
        }
    }
}
var list = {
    command: 'list',

    describe: 'List Pinza clusters',

    builder(yargs) {
        return yargs
    },

    async handler(argv) {
        const { print, pinza } = argv.ctx;

        var clusters = await pinza.config.get('clusters');

        var table = new AsciiTable(`Clusters (Total: ${Object.keys(clusters).length})`);
        table.setHeading("Name", "Address");
        for (var name in clusters) {
            var cluster_info = clusters[name];
            table.addRow(name, cluster_info.address)
        }
        print(table.toString())
    }
}
module.exports = {
    command: 'cluster <command>',

    describe: 'Access cluster specific commands.',

    builder(yargs) {
        return yargs.command(myCommitment).command(Export).command(Import).command(pin)
            .command(create).command(join).command(leave).command(open).command(list)
            .option('cluster', {
                type: 'string',
                describe: "name of cluster"
            });
    }
}