const HttpClient = require('../src/HTTPClient')
const assert = require('assert')
describe("Http Client", () => {
    it("Test url is created properly", (done) => {
        var client = new HttpClient("/ip4/127.0.0.1/tcp/8081")
        assert.strictEqual(client._craftURL("/api/v0/config"), "http://127.0.0.1:8081/api/v0/config")
        done();
    })
})