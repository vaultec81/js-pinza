const Hapi = require("@hapi/hapi")
const debug = require('debug')
const Pino = require('hapi-pino')
const toMultiaddr = require('uri-to-multiaddr')

const errorHandler = require('./error-handler')
const LOG = 'pinza:http-api'
const LOG_ERROR = 'pinza:http-api:error'


function hapiInfoToMultiaddr (info) {
    let hostname = info.host
    let uri = info.uri
    // ipv6 fix
    if (hostname.includes(':') && !hostname.startsWith('[')) {
      // hapi 16 produces invalid URI for ipv6
      // we fix it here by restoring missing square brackets
      hostname = `[${hostname}]`
      uri = uri.replace(`://${info.host}`, `://${hostname}`)
    }
    return toMultiaddr(uri)
  }

async function serverCreator(serverAddrs, createServer, pinza) {
    serverAddrs = serverAddrs || []
    // just in case the address is just string
    serverAddrs = Array.isArray(serverAddrs) ? serverAddrs : [serverAddrs]

    const servers = []
    for (const address of serverAddrs) {
        const addrParts = address.split('/')
        const server = await createServer(addrParts[2], addrParts[4], pinza)
        await server.start()
        server.info.ma = hapiInfoToMultiaddr(server.info)
        servers.push(server)
    }
    return servers
}
class httpApi {
    constructor(pinza, options) {
        this.pinza = pinza;
        this._options = options || {};
        this.server = null;
    }
    get address() {
        return this.pinza.config.get("api.http.apiAddr")
    }
    get name() {
        return "HTTP Admin API"
    }
    async _createApiServer(host, port, pinza) {
        const server = Hapi.server({
            host,
            port,
            // CORS is enabled by default
            // TODO: shouldn't, fix this
            routes: {
                cors: true
            },
            // Disable Compression
            // Why? Streaming compression in Hapi is not stable enough,
            // it requires bug-prone hacks such as https://github.com/hapijs/hapi/issues/3599
            compression: false
        })
        server.app.pinza = pinza

        await server.register({
            plugin: Pino,
            options: {
                prettyPrint: process.env.NODE_ENV !== 'production',
                logEvents: ['onPostStart', 'onPostStop', 'response', 'request-error'],
                level: debug.enabled(LOG) ? 'debug' : (debug.enabled(LOG_ERROR) ? 'error' : 'fatal')
            }
        })

        // https://github.com/ipfs/go-ipfs-cmds/pull/193/files
        server.ext({
            type: 'onRequest',
            method: function (request, h) {
                // This check affects POST as we should never get POST requests from a
                // browser without Origin or Referer, but we might:
                // https://bugzilla.mozilla.org/show_bug.cgi?id=429594
                if (request.method !== 'post') {
                    return h.continue
                }

                const headers = request.headers || {}
                const origin = headers.origin || ''
                const referrer = headers.referrer || ''
                const userAgent = headers['user-agent'] || ''

                // If these are set, we leave up to CORS and CSRF checks.
                if (origin || referrer) {
                    return h.continue
                }

                // Allow if the user agent does not start with Mozilla... (i.e. curl)
                if (!userAgent.startsWith('Mozilla')) {
                    return h.continue
                }

                // Disallow otherwise.
                //
                // This means the request probably came from a browser and thus, it
                // should have included Origin or referer headers.
                throw Boom.forbidden()
            }
        })



        // Set default headers
        /*setHeader('Access-Control-Allow-Headers',
            'X-Stream-Output, X-Chunked-Output, X-Content-Length')
        setHeader('Access-Control-Expose-Headers',
            'X-Stream-Output, X-Chunked-Output, X-Content-Length')*/

        server.route(require('./routes'))

        errorHandler(server)

        return server
    }
    async start() {
        var apiAddr = this.pinza.config.get("api.http.apiAddr")
        this.server = await serverCreator(apiAddr, this._createApiServer, this.pinza);
    }
    async stop() {

    }
}
module.exports = httpApi