const CommandPacketParser = require("../lib/parser")
const { Transform } = require("stream")
const reserved = require("../lib/reserved")
const assert = require("assert")

describe("Parser tests", () => {
    
    describe("Command packets", () => {
        beforeEach(() => {
            this.stream = new Transform()
            this.parser = new CommandPacketParser()
            this.stream.pipe(this.parser)
        })
        it("Simple command", (done) => {
            let data = [reserved.CMDSTRT, 1, reserved.CMDSTOP]
            this.parser.on("data", (newData) => {
                assert.deepEqual(Array.from(newData), data)
                done()
            })
            this.stream.push(Buffer.from(data))
        })
        it("Split command", (done) => {
            let data1 = [reserved.CMDSTRT, 1, 2]
            let data2 = [reserved.CMDSTOP]
            this.parser.on("data", (newData) => {
                assert.deepEqual(Array.from(newData), [reserved.CMDSTRT, 1, 2, reserved.CMDSTOP])
                done()
            })
            this.stream.push(Buffer.from(data1))
            this.stream.push(Buffer.from(data2))
        })
        it("Embedded Command", (done) => {
            let data = [1, 2, 3, reserved.CMDSTRT, 1, reserved.CMDSTOP, 1, 23]
            this.parser.on("data", (newData) => {
                assert.deepEqual(Array.from(newData), [reserved.CMDSTRT, 1, reserved.CMDSTOP])
                done()
            })
            this.stream.push(Buffer.from(data))
        })

        it("Multiple commands", (done) => {
            let data = [reserved.CMDSTRT, 1, reserved.CMDSTOP, 134, 23, reserved.CMDSTRT, 2, reserved.CMDSTOP]
            let next = false
            this.parser.on("data", (newData) => {
                if (!next) {
                    assert.deepEqual(Array.from(newData), [reserved.CMDSTRT, 1, reserved.CMDSTOP])
                    next = true
                }
                else {
                    assert.deepEqual(Array.from(newData), [reserved.CMDSTRT, 2, reserved.CMDSTOP])
                    done()
                }
            })
            this.stream.push(Buffer.from(data))
        })

        it("Multiple split commands", (done) => {
            let data1 = [reserved.CMDSTRT, 1, reserved.CMDSTOP, 134]
            let data2 = [23, reserved.CMDSTRT, 2, reserved.CMDSTOP]
            let next = false
            this.parser.on("data", (newData) => {
                if (!next) {
                    assert.deepEqual(Array.from(newData), [reserved.CMDSTRT, 1, reserved.CMDSTOP])
                    next = true
                }
                else {
                    assert.deepEqual(Array.from(newData), [reserved.CMDSTRT, 2, reserved.CMDSTOP])
                    done()
                }
            })
            this.stream.push(Buffer.from(data1))
            this.stream.push(Buffer.from(data2))

        })

        it("Primitive command", (done) => {
            let data = [reserved.CMDACKN]
            this.parser.on("data", (newData) => {
                assert.deepEqual(Array.from(newData), [reserved.CMDACKN])
                done()
            })
            this.stream.push(Buffer.from(data))

        })

        it("Command with primitive command interlieved", (done) => {
            let data = [reserved.CMDSTRT, 1, reserved.CMDACKN, reserved.CMDSTOP]
            this.parser.on("data", (newData) => {
                assert.deepEqual(Array.from(newData), data)
                done()
            })
            this.stream.push(Buffer.from(data))

        })
        it("Command with SYNCPKT preamble", (done) => {
            let data = [reserved.SYNCPKT, reserved.SYNCPKT,reserved.CMDSTRT, 1,2, reserved.CMDSTOP]
            this.parser.on("data", (newData) => {
                assert.deepEqual(Array.from(newData), [reserved.CMDSTRT, 1, 2, reserved.CMDSTOP])
                done()
            })
            this.stream.push(Buffer.from(data))

        })
    })

    describe("Data packets", () => {
        beforeEach(() => {
            this.stream = new Transform()
            this.parser = new CommandPacketParser()
            this.stream.pipe(this.parser)
        })
        it("Simple data packet", (done) => {
            let data = [reserved.DATSTRT, 1, reserved.DATSTOP]
            this.parser.on("data", (newData) => {
                assert.deepEqual(Array.from(newData), data)
                done()
            })
            this.stream.push(Buffer.from(data))
        })
        it("Split data packet", (done) => {
            let data1 = [reserved.DATSTRT, 1, 2]
            let data2 = [reserved.DATSTOP]
            this.parser.on("data", (newData) => {
                assert.deepEqual(Array.from(newData), [reserved.DATSTRT, 1, 2, reserved.DATSTOP])
                done()
            })
            this.stream.push(Buffer.from(data1))
            this.stream.push(Buffer.from(data2))
        })
        it("Embedded data packet", (done) => {
            let data = [1, 2, 3, reserved.DATSTRT, 1, reserved.DATSTOP, 1, 23]
            this.parser.on("data", (newData) => {
                assert.deepEqual(Array.from(newData), [reserved.DATSTRT, 1, reserved.DATSTOP])
                done()
            })
            this.stream.push(Buffer.from(data))
        })

        it("Multiple data packets", (done) => {
            let data = [reserved.DATSTRT, 1, reserved.DATSTOP, 134, 23, reserved.DATSTRT, 2, reserved.DATSTOP]
            let next = false
            this.parser.on("data", (newData) => {
                if (!next) {
                    assert.deepEqual(Array.from(newData), [reserved.DATSTRT, 1, reserved.DATSTOP])
                    next = true
                }
                else {
                    assert.deepEqual(Array.from(newData), [reserved.DATSTRT, 2, reserved.DATSTOP])
                    done()
                }
            })
            this.stream.push(Buffer.from(data))
        })

        it("Multiple split data packets", (done) => {
            let data1 = [reserved.DATSTRT, 1, reserved.DATSTOP, 134]
            let data2 = [23, reserved.DATSTRT, 2, reserved.DATSTOP]
            let next = false
            this.parser.on("data", (newData) => {
                if (!next) {
                    assert.deepEqual(Array.from(newData), [reserved.DATSTRT, 1, reserved.DATSTOP])
                    next = true
                }
                else {
                    assert.deepEqual(Array.from(newData), [reserved.DATSTRT, 2, reserved.DATSTOP])
                    done()
                }
            })
            this.stream.push(Buffer.from(data1))
            this.stream.push(Buffer.from(data2))

        })

        it("Primitive data packet", (done) => {
            let data = [reserved.CMDACKN]
            this.parser.on("data", (newData) => {
                assert.deepEqual(Array.from(newData), [reserved.CMDACKN])
                done()
            })
            this.stream.push(Buffer.from(data))

        })

        it("data packet with primitive command interlieved", (done) => {
            let data = [reserved.DATSTRT, 1, reserved.CMDACKN, reserved.DATSTOP]
            this.parser.on("data", (newData) => {
                assert.deepEqual(Array.from(newData), data)
                done()
            })
            this.stream.push(Buffer.from(data))

        })
    })
})