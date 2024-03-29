const assert = require("assert")
const SAN = require("../lib/core").SensorArea
const reserved = require("../lib/reserved")
const FakeSerial = require("./fakeSerial")


describe("Sensor area network api tests", () => {
    const port = new FakeSerial()
    let client = new SAN(port)
    
    before(() => {
        port.on("error", assert.fail)        
    })
    
    it("Short command test", () => {
        port.once("self", () => {
            port.respond(Buffer.from([reserved.CMDACKN]))
        })
        return client.shortCommand(1,2,[3])
    })

    it("Dirty bytes test", () => {
        port.once("self", () => {
            port.respond(Buffer.from([reserved.CMDACKN]))
        })
        //Forcing parser to buffer data
        client.parser.pause()
        port.push(Buffer.from([reserved.NOTACKN,reserved.NOTACKN,reserved.NOTACKN]))
        client.parser.resume()
        return client.shortCommand(1,2,[3])
    })

    it("Short command with high value args", () => {
        port.once("self", (data) => {
            assert.deepEqual([170,89,149,170],[...data.slice(9,13)])
            port.respond(Buffer.from([reserved.CMDACKN]))
        })
        return client.shortCommand(0, 0, [2000])
    })

    it("Short query test", () => {
        port.once("self", () => {
            port.respond(Buffer.from([reserved.CMDSTRT,0,0,reserved.CMDSTOP]))
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
            assert.deepEqual(Buffer.from([0,1,1,0]), data[0], "Wrong header response")
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
            assert.deepEqual(Buffer.from([0, 1, 2, 0]), data[0], "Wrong header response")
            assert.equal(24, data[1][0], "Wrong query response")
            assert.equal(42, data[2][0], "Wrong query response")
        })
    })
})