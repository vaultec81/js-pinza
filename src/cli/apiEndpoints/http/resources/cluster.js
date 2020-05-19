exports.myCommitment = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { cluster, r, n } = request.payload
        if (!cluster) {
            return new Error("Cluster string is a required argument")
        }
        try {
            var Cluster = pinza.cluster(cluster)
            console.log(await Cluster.pin.currentCommitment(r, n))
            return h.response(await Cluster.pin.currentCommitment(r, n))
        } catch (err) {
            console.log(err)
        }
    }
}
exports.pin = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { cluster, cid } = request.payload
        var Cluster = pinza.cluster(cluster)
        try {
            await Cluster.pin.add(cid)
            return h.response({
                success: true
            });
        } catch (err) {
            return h.response({
                success: false
            })
        }
    }
}
exports.unpin = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { cluster, cid } = request.payload
        var Cluster = pinza.cluster(cluster)
        await Cluster.pin.rm(cid)
        return h.response({});
    }
}
exports.join = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { cluster } = request.query
        return h.response({});
    }
}
exports.leave = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { cluster } = request.query
        return h.response({});
    }
}
exports.create = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { name, options } = request.payload;
        try {
            await pinza.createCluster(name, options)
        } catch (err) {
            console.log(err)
            if (err.code) {
                return h.response({
                    success: false,
                    err: err.toString(),
                    code: err.code
                })
            } else {
                return h.response({
                    success: false,
                    err: err.toString()
                })
            }
        }
        return h.response({
            success: true,
            payload: pinza.config.get(`clusters.${name}`)
        })
    }
}
exports.export = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { cluster } = request.payload;
        if (!cluster) {
            cluster = pinza.config.get("defaultCluster")
        }
        try {
            return h.response({
                success: true,
                payload: await pinza.cluster(cluster).export()
            })
        } catch (err) {
            console.log(err)
        }
    }
}
exports.ls = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { cluster } = request.payload;

    }
}