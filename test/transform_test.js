const encode = require("../lib/transform").encode
const decode = require("../lib/transform").decode
const assert = require("assert")
describe("Encode and Decode test for SAN network", () => {
    describe("Encode tests", () => {
        it("Empty data encode", () => {
            let res = Array.from(encode([1]))
            assert.deepEqual(res, [169, 170])
        })
        it("Multi data encode", () => {
            let res = Array.from(encode([1, 2, 3]))
            assert.deepEqual(res, [169, 170, 166, 170, 165, 170])
        })
    })

    describe("Transform tests", () => {
        it("Simple data encode decode", () => {
            let res = Array.from(encode([1]))
            assert.deepEqual(res, [169, 170])

            let data = Array.from(decode(res))
            assert.deepEqual(data, [1])
        })

        it("Multiple data encode decode", () => {
            let res = Array.from(encode([1, 2, 100]))

            let data = Array.from(decode(res))
            assert.deepEqual(data, [1, 2, 100])
        })

        it("Simple Command", () => {
            let res = Array.from(encode([1, 2, 100]))

            let data = Array.from(decode(res))
            assert.deepEqual(data, [1, 2, 100])
        })
    })
})
