const handlers = require("../lib/handlers")
const FakeSerial = require("./fakeSerial")
const assert = require("assert")
const reserved = require("../lib/reserved")
const encode = require("../lib/transform").encode
const decode = require("../lib/transform").decode


describe("Handler tests", () => {
    var Recorder = class {
        constructor() {
            this.states = []
        }

        record(data) {
            this.states.push(data.toState)
        }
    }
    
    describe("Query handler", () => {

        beforeEach(() => {
            this.handler = handlers.sqryHandler()
            this.stream = new FakeSerial()
            this.handler.initialize(this.stream,this.stream)
            this.recorder = new Recorder()
            this.handler.on("transition", this.recorder.record.bind(this.recorder))
        })
      

        it("Normal flow", (done) => {
            let stream = this.stream
            this.handler.on("transitioned", function (data) {
                if (data.toState === "wait") {
                    stream.respond([reserved.CMDSTRT, 2 ,reserved.CMDSTOP])
                }else if(data.toState === "ready"){
                    done()
                }
            })

            //Fsm is in its last state
            this.handler.on("data", (data) => {
                assert.deepEqual(this.recorder.states, ["send", "wait","handle", "sendAck"])
                assert.equal(data[0], 2)
            })

            this.handler.on("error", done)
            this.handler.start([])
        })

       
        it("should ignore other data", (done) => {
            let stream = this.stream
            let packet = 0
            this.handler.on("transitioned", function (data) {
                if (data.toState === "wait" && packet === 0) {
                    packet++
                    stream.respond([reserved.DATACKN])
                }else if(data.toState === "wait" && packet === 1 ){
                    stream.respond([reserved.CMDSTRT, 2, reserved.CMDSTOP])                    
                }
            })

            //Fsm is in its last state
            this.handler.on("data", (data) => {
                assert.deepEqual(this.recorder.states, ["send", "wait", "handle","wait","handle", "sendAck"])
                assert.equal(data[0], 2)
                done()
            })

            this.handler.on("error", done)
            this.handler.start([])
        })
    
        it("Not acknowledge", (done) => {
            let stream = this.stream
        
            this.handler.on("transitioned", function (data) {
                if (data.toState === "wait") {
                    stream.respond([reserved.NOTACKN])
                }
            })
        
            //Fsm is in its last state
            this.handler.on("data", () => {
                assert.fail("No data should be notified")
            })
        
        
            this.handler.on("error", (err) => {
                try {
                    assert.deepEqual(this.recorder.states, ["send", "wait","handle","error"])
                    assert.notStrictEqual(err, new Error("Invalid packet response"))
                    done()
                } catch (error) {
                    done(error)
                }
            })
            this.handler.start([])
        })
        it("Timeout", (done) => {

            this.handler.on("error", (err) => {
                try {
                    assert.deepEqual(this.recorder.states, ["send", "wait","timeout"])
                    assert.notStrictEqual(err, new Error("Timeout during shortquery"))
                    done()
                } catch (error) {
                    done(error)
                }
            })
            this.handler.initialize(this.stream, this.stream,{timeout: 100})
            this.handler.start([])
        })

        it("Retry successfully", (done) => {
            let stream = this.stream
            let packet = 0
            
            this.handler.on("transitioned", function (data) {
               
                if (data.toState === "wait" ) {
                    packet++;
                    packet === 2 && stream.respond([reserved.CMDSTRT, 2, reserved.CMDSTOP])
                } else if (data.toState === "ready") {
                    done()
                }
            })

            //Fsm is in its last state
            this.handler.on("data", (data) => {
                assert.deepEqual(this.recorder.states, ["send", "wait", "retry", "send", "wait", "handle", "sendAck"])
                assert.equal(data[0], 2)
            })

            this.handler.on("error", done)
            this.handler.initialize(this.stream, this.stream, { retryTimeout: 100, retries: 1 })
            this.handler.start([])
        })

        it("Retry multiple times successfully", (done) => {
            let stream = this.stream
            let packet = 0
            
            this.handler.on("transitioned", function (data) {
               
                if (data.toState === "wait" ) {
                    packet++;
                    packet === 6 && stream.respond([reserved.CMDSTRT, 2, reserved.CMDSTOP])
                } else if (data.toState === "ready") {
                    done()
                }
            })

            //Fsm is in its last state
            this.handler.on("data", (data) => {
                let states = []
                for (let i = 0; i < 5; i++) {
                    states.push(...["send", "wait", "retry"])
                }

                assert.deepEqual(this.recorder.states, [...states, "send", "wait", "handle", "sendAck"])
                assert.equal(data[0], 2)
            })

            this.handler.on("error", done)
            this.handler.initialize(this.stream, this.stream, { retryTimeout: 100, retries: 5 })
            this.handler.start([])
        })

        it("Retry but fail", (done) => {
            
            //Fsm is in its last state
            this.handler.on("error", (err) => {
                try {
                    assert.deepEqual(this.recorder.states, ["send", "wait", "retry", "send", "wait", "retry", "error"])
                    assert.notStrictEqual(err, new Error("Retry limit reached: 1"))
                    done()
                } catch (error) {
                    done(error)
                }
            })

            this.handler.initialize(this.stream, this.stream, { retryTimeout: 100, retries: 1 })
            this.handler.start([])
        })
    
        it("It should reset", (done) => {
            //let reset = this.handler.reset.bind(this.handler)
            
            this.handler.initialize(this.stream, this.stream)
            this.handler.start([])
            this.handler.reset()
            done()
        })
    })

    describe("Long query handler", () => {

        beforeEach(() => {
            this.handler = handlers.lqryHandler()
            this.stream = new FakeSerial()
            this.handler.initialize(this.stream, this.stream)
            this.recorder = new Recorder()
            this.handler.on("transition", this.recorder.record.bind(this.recorder))
        })

        it("Normal flow", (done) => {
            let stream = this.stream
            let datapck = [reserved.DATSTRT, 1,2,3,4, reserved.DATSTOP]
            this.handler.on("transitioned", function (data) {
                if (data.toState === "wait") {
                    stream.respond([reserved.CMDSTRT, ...encode([0,1,1,0]), reserved.CMDSTOP])
                } else if (data.toState === "bufferDataPck"){
                    stream.respond(datapck)
                }
            })

            //Fsm is in its last state
            this.handler.on("data", (data) => {
                assert.deepEqual(this.recorder.states, ["send", "wait", "handle", "sendAck","bufferDataPck"])
                assert.deepEqual(Array.from(data), datapck.slice(1, datapck.length - 1))
                done()
            })

            this.handler.on("dataStart", (data) => {
                assert.deepEqual(this.recorder.states, ["send", "wait", "handle", "sendAck"])
                assert.deepEqual(Array.from(decode(data)), [0,1,1,0])
            })

            this.handler.on("error", done)
            this.handler.start([])
        })

        it("Timeout command packet", (done) => {

            this.handler.on("error", (err) => {
                try {
                    assert.deepEqual(this.recorder.states, ["send", "wait", "timeout"])
                    assert.notStrictEqual(err, new Error("Timeout during shortquery"))
                    done()
                } catch (error) {
                    done(error)
                }
            })
            this.handler.initialize(this.stream, this.stream, {timeout: 100})
            this.handler.start([])
        })

        it("Timeout data packet", (done) => {
            let stream = this.stream
    
            this.handler.on("transitioned", function (data) {
                if (data.toState === "wait") {
                    stream.respond([reserved.CMDSTRT, ...encode([0, 1, 1, 0]), reserved.CMDSTOP])
                } 
            })

            this.handler.on("error", (err) => {
                try {
                    assert.deepEqual(this.recorder.states, ["send", "wait", "handle", "sendAck", "bufferDataPck", "timeout"])
                    assert.notStrictEqual(err, new Error("Timeout during shortquery"))
                    done()
                } catch (error) {
                    done(error)
                }
            })
            this.handler.initialize(this.stream, this.stream, {timeout : 100})
            this.handler.start([])
        })


        it("Retry successfully", (done) => {
            let stream = this.stream
            let datapck = [reserved.DATSTRT, 1, 2, 3, 4, reserved.DATSTOP]
            let packet = 0

            this.handler.on("transitioned", function (data) {

                if (data.toState === "wait") {
                    packet++;
                    packet === 2 && stream.respond([reserved.CMDSTRT, ...encode([0, 1, 1, 0]), reserved.CMDSTOP])
                } else if (data.toState === "bufferDataPck") {
                    stream.respond(datapck)
                }
            })

            //Fsm is in its last state
            this.handler.on("data", (data) => {
                assert.deepEqual(this.recorder.states, ["send", "wait", "retry", "send", "wait", "handle", "sendAck", "bufferDataPck"])
                assert.deepEqual(Array.from(data), datapck.slice(1, datapck.length - 1))
                done();
            })

            this.handler.on("dataStart", (data) => {
                assert.deepEqual(this.recorder.states, ["send", "wait", "retry","send", "wait", "handle", "sendAck"])
                assert.deepEqual(Array.from(decode(data)), [0, 1, 1, 0])
            })

            this.handler.on("error", done)
            this.handler.initialize(this.stream, this.stream, { retryTimeout: 100, retries: 1 })
            this.handler.start([])
        })

        it("Retry multiple times successfully", (done) => {
            let stream = this.stream
            let datapck = [reserved.DATSTRT, 1, 2, 3, 4, reserved.DATSTOP]
            let packet = 0

            this.handler.on("transitioned", function (data) {

                if (data.toState === "wait") {
                    packet++;
                    packet === 6 && stream.respond([reserved.CMDSTRT, ...encode([0, 1, 1, 0]), reserved.CMDSTOP])
                } else if (data.toState === "bufferDataPck") {
                    stream.respond(datapck)
                }
            })

            //Fsm is in its last state
            this.handler.on("data", (data) => {
                let states = []
                for (let i = 0; i < 5; i++) {
                    states.push(...["send", "wait", "retry"])
                }
                assert.deepEqual(this.recorder.states, [...states, "send", "wait", "handle", "sendAck", "bufferDataPck"])
                assert.deepEqual(Array.from(data), datapck.slice(1, datapck.length - 1))
                done();
            })

            this.handler.on("dataStart", (data) => {
                let states = []
                for (let i = 0; i < 5; i++) {
                    states.push(...["send", "wait", "retry"])
                }
                assert.deepEqual(this.recorder.states, [...states, "send", "wait", "handle", "sendAck"])
                assert.deepEqual(Array.from(decode(data)), [0, 1, 1, 0])
            })

            this.handler.on("error", done)
            this.handler.initialize(this.stream, this.stream, { retryTimeout: 100, retries: 5 })
            this.handler.start([])
        })

        it("Retry but fail", (done) => {

            //Fsm is in its last state
            this.handler.on("error", (err) => {
                try {
                    assert.deepEqual(this.recorder.states, ["send", "wait", "retry", "send", "wait", "retry", "error"])
                    assert.notStrictEqual(err, new Error("Retry limit reached: 1"))
                    done()
                } catch (error) {
                    done(error)
                }
            })

            this.handler.initialize(this.stream, this.stream, { retryTimeout: 100, retries: 1 })
            this.handler.start([])
        })

    })
    describe("Command handler", () => {
       
        beforeEach(() => {
            this.handler = handlers.scmdHandler()
            this.stream = new FakeSerial()
            this.handler.initialize(this.stream,this.stream)
            this.recorder = new Recorder()
            this.handler.on("transition", this.recorder.record.bind(this.recorder))
        })

        it("Normal flow", (done) => {
            let stream = this.stream
            this.handler.on("transitioned", function (data) {
                if (data.toState === "wait") {
                    stream.respond([reserved.CMDACKN])
                }
            })

            //Fsm is in its last state
            this.handler.on("sent", () => {
                assert.deepEqual(this.recorder.states, ["send", "wait","handle","done"])
                done()
            })

            this.handler.on("error", done)
            this.handler.start([])
        })
        it("should ignore other packet", (done) => {
            let stream = this.stream
            let packet = 0
            this.handler.on("transitioned", function (data) {
                if (data.toState === "wait" && packet == 0) {
                    packet++
                    stream.respond([reserved.DATACKN])
                } else if (data.toState === "wait" && packet === 1) {
                    stream.respond([reserved.CMDACKN])
                }
            })

            //Fsm is in its last state
            this.handler.on("sent", () => {
                assert.deepEqual(this.recorder.states, ["send", "wait", "handle","wait","handle","done"])
                done()
            })

            this.handler.on("error", done)
            this.handler.start([])
        })
        it("Not acknowledge", (done) => {
            let stream = this.stream

            this.handler.on("transitioned", function (data) {
                if (data.toState === "wait") {
                    stream.respond([reserved.NOTACKN])
                }
            })

            //Fsm is in its last state
            this.handler.on("data", () => {
                assert.fail("No data should be notified")
            })


            this.handler.on("error", (err) => {
                try {
                    assert.deepEqual(this.recorder.states, ["send", "wait", "handle", "error"])
                    assert.notStrictEqual(err, new Error("Invalid packet response"))
                    done()
                } catch (error) {
                    done(error)
                }
            })
            this.handler.start([])
        })
        it("Timeout", (done) => {

            this.handler.on("error", (err) => {
                try {
                    assert.deepEqual(this.recorder.states, ["send", "wait", "timeout"])
                    assert.notStrictEqual(err, new Error("Timeout during shortquery"))
                    done()
                } catch (error) {
                    done(error)
                }
            })
            this.handler.initialize(this.stream, this.stream, {timeout : 100})
            this.handler.start([])
        })

        it("Retry successfully", (done) => {
            let stream = this.stream
            let packet = 0

            this.handler.on("transitioned", function (data) {

                if (data.toState === "wait") {
                    packet++;
                    packet === 2 && stream.respond([reserved.CMDACKN])
                } else if (data.toState === "ready") {
                    done()
                }
            })

            //Fsm is in its last state
            this.handler.on("data", (data) => {
                assert.deepEqual(this.recorder.states, ["send", "wait", "retry", "send", "wait", "handle", "done"])
                assert.equal(data[0], 2)
            })

            this.handler.on("error", done)
            this.handler.initialize(this.stream, this.stream, { retryTimeout: 100, retries: 1 })
            this.handler.start([])
        })

        it("Retry multiple times successfully", (done) => {
            let stream = this.stream
            let packet = 0

            this.handler.on("transitioned", function (data) {

                if (data.toState === "wait") {
                    packet++;
                    packet === 6 && stream.respond([reserved.CMDACKN])
                } else if (data.toState === "ready") {
                    done()
                }
            })

            //Fsm is in its last state
            this.handler.on("data", (data) => {
                let states = []
                for (let i = 0; i < 5; i++) {
                    states.push(...["send", "wait", "retry"])
                }

                assert.deepEqual(this.recorder.states, [...states, "send", "wait", "handle", "done"])
                assert.equal(data[0], 2)
            })

            this.handler.on("error", done)
            this.handler.initialize(this.stream, this.stream, { retryTimeout: 100, retries: 5 })
            this.handler.start([])
        })

        it("Retry but fail", (done) => {

            //Fsm is in its last state
            this.handler.on("error", (err) => {
                try {
                    assert.deepEqual(this.recorder.states, ["send", "wait", "retry", "send", "wait", "retry", "error"])
                    assert.notStrictEqual(err, new Error("Retry limit reached: 1"))
                    done()
                } catch (error) {
                    done(error)
                }
            })

            this.handler.initialize(this.stream, this.stream, { retryTimeout: 100, retries: 1 })
            this.handler.start([])
        })
    })
   
})