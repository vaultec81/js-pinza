exports.myCommitment = {
    async handler(request, h) {
        const { pinza } = request.server.app;
        const {name, r, n} = request.query
        if(!name) {
            return new Error("name is a required argument")
        }
        var cluster = pinza.cluster(name)
        return h.response(await cluster.pin.currentCommitment(r, n))
    }
}