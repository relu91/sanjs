const assert = require("assert")
const san = require("../lib/core")
const reserved = require("../lib/reserved")
const FakeSerial = require("./fakeSerial")


describe("Sensor area network api tests", () => {
    const port = new FakeSerial()
    let client = san(port)
    
    before(() => {
        port.on("error", assert.fail)        
    })
    
    it("Short command test", () => {
        port.once("self", () => {
            port.respond(Buffer.from([reserved.CMDACKN]))
        })
        return client.shortCommand(1,2,[3])
    })

    it("Short query test", () => {
        port.once("self", () => {
            port.respond(Buffer.from([202,0,0,172]))
        })
        return client.shortQuery(1, 2, [3]).then((data) => {
            assert.equal(0,data[0],"Wrong query response")
        })
    })

    it("Long query test", () => {
        port.once("self", () => {
            port.once("self", (data) => {
                if (data[0] === reserved.CMDACKN) {
                    port.respond(Buffer.from([reserved.DATSTRT, 106, 169, reserved.DATSTOP]))
                }
            })
            port.respond(Buffer.from([reserved.CMDSTRT, 170, 170, 169, 170, 169, 170, 170, 170, reserved.CMDSTOP]))
            
        })

        return client.LongQuery(1, 2, [3]).then((data) => {
            assert.deepEqual([0,1,1,0], data[0], "Wrong header response")
            assert.equal(24, data[1][0], "Wrong query response")
        })
    })

    it("Long query multiple packet test", () => {
        port.once("self", () => {
            port.once("self", (data) => {
                if (data[0] === reserved.CMDACKN) {
                    port.respond(Buffer.from([reserved.DATSTRT, 106, 169, reserved.DATSTOP]))
                    // TODO wait for the ack
                    port.respond(Buffer.from([reserved.DATSTRT, 102,166, reserved.DATSTOP]))
                }
            })
            port.respond(Buffer.from([reserved.CMDSTRT, 170, 170, 169, 170, 166, 170, 170, 170, reserved.CMDSTOP]))

        })

        return client.LongQuery(1, 2, [3]).then((data) => {
            assert.deepEqual([0, 1, 2, 0], data[0], "Wrong header response")
            assert.equal(24, data[1][0], "Wrong query response")
            assert.equal(42, data[2][0], "Wrong query response")
        })
    })
})