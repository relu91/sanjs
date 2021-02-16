var machina = require("machina")
var debug = require("debug")("handler")
const reserved = require("./reserved")
const decode = require("./transform").decode
const TimoutError = require("./errors").timeout
const defaultTO = 2147483647 //MAX 32bit signed integer value 

function forwardData(data) {
    this.handle("data",data)
}

/**
 * The SAN protocol specification is implemented with Finete State Machines.
 * 
 * This is the base class that handles the common states:
 *  - ready   : wait for a command
 *  - send    : send the commando to the serial interface
 *  - wait    : wait for incoming data
 *  - timeout : handle a timeout
 *  - error   : error state; clean up resources and emit an error event
 * @class
 */
var baseFSM = machina.Fsm.extend({
    initialize: function (writer, reader, timeout) {
        // TODO: handle I/O error
        this.writer = writer
        this.reader = reader
        this.to = timeout ? timeout : defaultTO
    },
    initialState: "ready",
    states: {
        ready: {
            command: function (command) {
                debug("Ready for command %o",command)
                debug("Clearing the reading buffer...")
                this.reader.pause();
                let chunk;
                while (null !== (chunk = this.reader.read())) {
                    debug("Found dirty bytes")
                    debug("Removed:",chunk)
                }
                debug("Cleaned");
                this.reader.resume();

                this.command = Buffer.from(command)
                this.transition("send")
            }
        },
        send: {
            _onEnter: function () {
                this.dataListner = forwardData.bind(this)
                this.reader.on("data", this.dataListner)

                this.timer = setTimeout(function () {
                    this.transition("timeout")
                }.bind(this), this.to)
                
                debug("Sending command %o", this.command)
                this.writer.write(this.command)
                debug("Sent")

                this.transition("wait")
            },
            //Data arrived before transition
            data : function () {
                this.deferUntilTransition("wait")
            }
        },
        wait : {
            data: function (data) {
                this.response = data
                this.transition("handle")
            },
        },
        timeout: {
            _onEnter: function () {
                this.reader.removeListener("data", this.dataListner)
                this.emit("error", new TimoutError(this.to))
            },
        },
        error: {
            _onEnter: function () {
                clearTimeout(this.timer)
                this.reader.removeListener("data", this.dataListner)
                this.writer.write(Buffer.from([reserved.NOTACKN]))
                this.emit("error", this.error)
            }
        }
    },
    start: function (command) {
        this.handle("command", command)
    },
    reset: function () {
        this.reader.removeListener("data", this.dataListner)
        clearTimeout(this.timer)
        this.transition("ready")
    }
    

})
/**
 * Handler for the short query flow
 * @class
 */
var sqryHanFSM = baseFSM.extend({
    states : {
        handle: {
            _onEnter : function () {
                debug("Recieved response for short query", this.response)
                switch (this.response[0]) {
                    case reserved.CMDSTRT:
                        clearTimeout(this.timer)
                        this._data = this.response.slice(1, this.response.length - 1)
                        this.transition("sendAck")
                        break
                    case reserved.NOTACKN:
                        this.error = new Error("Command not acknoldged")
                        this.transition("error")
                        break
                    default:
                        debug("No valid packet recieved waiting...")
                        this.transition("wait")
                        break 
                } 
            }
        },
        sendAck: {
            _onEnter: function () {
                debug("Acknowldge packet")
                let fsm = this
                this.writer.write(Buffer.from([reserved.CMDACKN]), () => {
                    debug("Done")
                    fsm.emit("data", this._data)
                    this.transition("ready")
                })
            },
            _onExit: function () {
                this.reader.removeListener("data", this.dataListner)
            }
        }
    }
})
/**
 * Handler for the short command flow
 * @class
 */
var scmdFSM = baseFSM.extend({
    states:{
        handle: {
            _onEnter : function () {
                debug("Recieved response for short query", this.response)
                switch (this.response[0]) {
                    case reserved.CMDACKN:
                        clearTimeout(this.timer)
                        this.transition("done")
                        break
                    case reserved.NOTACKN:
                        this.error = new Error("Command not acknoldged")
                        this.transition("error")
                        break
                    default:
                        debug("No valid packet recieved waiting...")
                        this.transition("wait")
                        break
                }
            }
        },
        done : {
            _onEnter: function () {
                debug("Done", this.response)
                this.emit("sent")
                this.transition("ready")
            },
            _onExit: function () {
                this.reader.removeListener("data", this.dataListner)
            }
        }
    }
})
/**
 * Handler for the long query flow
 * @class
 */
var lqryHanFSM = baseFSM.extend({
    states: {
        handle: {
            _onEnter: function () {
                debug("Recieved response for long query", this.response)
                switch (this.response[0]) {
                    case reserved.CMDSTRT:
                        clearTimeout(this.timer)
                        this.header = this.response.slice(1, this.response.length - 1)
                        var decoded = decode(this.header)
                        this.packetCount = 0
                        this.totalPackets = decoded[1] * (decoded[2] + decoded[3] * 256)
                        this.transition("sendAck")
                        break
                    case reserved.NOTACKN:
                        this.error = new Error("Command not acknoldged")
                        this.transition("error")
                        break
                    default:
                        debug("No valid packet recieved waiting...")
                        this.transition("wait")
                        break
                }
            }
        },
        sendAck: {
            _onEnter: function () {
                let fsm = this
                debug("Acknowlge start data packet")
                this.writer.write(Buffer.from([reserved.CMDACKN]), () => {
                    debug("Done. Waiting for data...")
                    fsm.emit("dataStart", this.header)
                    if (this.totalPackets > 0) {
                        this.transition("bufferDataPck")
                    } else {
                        this.transition("done")
                    }
                })
            },
            data : function () {
                this.deferUntilTransition("bufferDataPck")
            }
        },
        bufferDataPck: {
            _onEnter: function (){
                this.timer = setTimeout(function () {
                    this.transition("timeout")
                }.bind(this), this.to)
            },
            data : function (data) {
                debug("data arrived: %o",data)
                if(data[0] === reserved.DATSTRT){
                    clearTimeout(this.timer)
                    data = data.slice(1,data.length -1 )
                    this.emit("data", data)
                    
                    debug("Sending ack")
                    this.writer.write(Buffer.from([reserved.DATACKN]))
                    debug("Sent")
                    
                    this.packetCount++
                }

                if(this.packetCount === this.totalPackets){
                    this.transition("done")
                }else{
                    this.timer = setTimeout(function () {
                        this.transition("timeout")
                    }.bind(this), this.to)
                }
                
            },
            _onExit: function () {
                this.reader.removeListener("data", this.dataListner)
            }
        },
        done: {
            _onEnter: function () {
                debug("Done.")
                this.emit("done", this.buffer)
                this.transition("ready")
            }
        }
    }
})

exports.sqryHandler = () => {
    return new sqryHanFSM()
} 

exports.lqryHandler = () => {
    return new lqryHanFSM()
} 

exports.scmdHandler = () => {
    return new scmdFSM()
}   