const ErrorCodes = require('../../../../core/ErrorCodes')
exports.myCommitment = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { cluster, r, n } = request.payload
        if (!cluster) {
            return new Error("Cluster string is a required argument")
        }
        try {
            var Cluster = pinza.cluster(cluster)
            return h.response({
                success: true,
                payload: await Cluster.pin.currentCommitment(r, n)
            })
        } catch (err) {
            return h.response({
                success: false,
                err: {
                    message: err.message,
                    code: err.code
                }
            })
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
                success: false,
                err: {
                    message: err.toString(),
                    code: err.code
                }
            })
        }
    }
}
exports.unpin = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { cluster, cid } = request.payload
        var Cluster = pinza.cluster(cluster)
        try {
            await Cluster.pin.rm(cid)
        } catch (err) {
            return h.response({
                err: {
                    code: err.code,
                    message: err.message
                },
                success: false
            });
        }
    }
}
exports.join = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { name, address, options } = request.payload
        try {
            await pinza.joinCluster(name, address, options);
            return h.response({
                success: true
            });
        } catch (err) {
            if (err) {
                return h.response({
                    success: false,
                    err: {
                        message: err.toString(),
                        code: err.code
                    }
                });
            }
        }
    }
}
exports.leave = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { name, options } = request.payload;
        try {
            await pinza.leaveCluster(name, options);
            return h.response({
                success: true
            });
        } catch (err) {
            return h.response({
                success: false,
                err: {
                    message: err.message,
                    code: err.code
                }
            });
        }
    }
}
exports.open = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { name, options } = request.payload;
        try {
            await pinza.openCluster(name, options);
            return h.response({
                success: true
            });
        } catch (err) {
            return h.response({
                success: false,
                err: {
                    message: err.message,
                    code: err.code
                }
            });
        }
    }
}
exports.create = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const { name, options } = request.payload;
        try {
            await pinza.createCluster(name, options)
            return h.response({
                success: true,
                payload: pinza.config.get(`clusters.${name}`)
            })
        } catch (err) {
            if (err.code) {
                return h.response({
                    success: false,
                    err: {
                        message: err.toString(),
                        code: err.code
                    }
                })
            } else {
                return h.response({
                    success: false,
                    err: {
                        message: err.toString(),
                        code: err.code
                    }
                })
            }
        }
    }
}
exports.export = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        var { cluster, options } = request.payload;
        if (!cluster) {
            cluster = pinza.config.get("defaultCluster")
        }
        try {
            return h.response({
                success: true,
                payload: await pinza.cluster(cluster).export(options)
            })
        } catch (err) {
            return h.response({
                success: false,
                err: {
                    message: err.toString(),
                    code: err.code
                }
            })
        }
    }
}
exports.import = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        var { cluster, input, options } = request.payload;
        if (!cluster) {
            cluster = pinza.config.get("defaultCluster")
        }
        try {
            await pinza.cluster(cluster).import(input, options)
            return h.response({
                success: true
            })
        } catch (err) {
            if(err.code) {
                return h.response({
                    success: false,
                    err: {
                        message: err.message,
                        code: err.code
                    }
                })
                
            } else {
                console.log(err); //Print error to CLI. TODO: add logging feature
                return h.response({
                    success: false,
                    err: {
                        message: err.message,
                        code: ErrorCodes.InternalServerError
                    }
                })
            }
        }
    }
}

exports.pinls = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        var { cluster, options } = request.payload;
        if (!cluster) {
            cluster = pinza.config.get("defaultCluster")
        }
        try {
            return h.response({
                success: true,
                payload: await pinza.cluster(cluster).pin.ls(options)
            })
        } catch (err) {
            if(err.code) {
                return h.response({
                    success: false,
                    err: {
                        message: err.message,
                        code: err.code
                    }
                })
            } else {
                console.log(err); //Print error to CLI. TODO: add logging feature
                return h.response({
                    success: false,
                    err: {
                        message: err.message,
                        code: ErrorCodes.InternalServerError
                    }
                })
            }
        }
    }
}