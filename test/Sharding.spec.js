'use strict'

const { Sharding } = require('../src/Core');
const multihash = require('multihashes')
const Crypto = require('crypto')
var assert = require('assert')

var nodeId = "QmZgpvo7Thqvxk5uzQbW8Xks6ss88HQWmTN3DZTjdpe8LA"

describe('Sharding', function () {
    it('Commitment', (done) => {
        var testSet = [];
        //Create 250 test hashes;
        for (var x = 0; x < 250; x++) {
            testSet.push(multihash.toB58String(multihash.encode(Crypto.randomBytes(32), 'sha2-256')))
        }

        var sharding = new Sharding(null, {
            nodeId
        })
        for (var e of testSet) {
            sharding.add(multihash.fromB58String(e))
        }
        var commitment = sharding.myCommitment(1, 5);
        assert.strictEqual(commitment.length, 50); //Expecting 50 from 250 input hashes with replication factor of 1


        done();
    });
    it("Add", (done) => {
        var sharding = new Sharding(null, {
            nodeId
        })
        try {
            sharding.add("QmaT5jqcHaAFphb8kFr6fMFCfFYCNBFFN7JaxYfNXvJpYn"); //Normal multihash
            sharding.add("bafyreihs3cjhxzyd3tgxwo4ra74lgxibuzqsvnmmnmz22ati2sn6ynkhk4") //CID
            assert.strictEqual(sharding.count(), 2)
        } catch(ex) {
            assert.fail(ex)
        }
        done();
    })
})