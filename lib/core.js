const SerialPort = require("serialport")
const transform = require("./transform")
const CommandPacketParser = require("./parser")
const reserved = require("./reserved")
const handlers = require("./handlers")
var Readable = require("stream").Readable



module.exports = (port) => {
    return new SensorAerea(port)
}

/**
 * The entry point to interact with Sensor Area Network
 * @class
 */
class SensorAerea {

    constructor(port) {
        if (typeof (port) === "string") {
            port = new SerialPort(port, {baudRate: 500000})
        }
        this.port = port
        this.parser = new CommandPacketParser()    
        this.port.pipe(this.parser)     
    }

    /**
     * Issue a short command to a specific sensor.
     * 
     * @param {byte} address 
     * @param {byte} command 
     * @param {Array} arg 
     * @param {Number} timeout
     * 
     * @returns {Promise} Promise object represents the completition of the command
     */
    shortCommand(address, command, arg,timeout) {
        arg = arg ? arg : []
        return new Promise((resolve, reject) => {
            let handler = handlers.scmdHandler()
            let cmd = createPacket(address, command, ...arg)
            handler.on("sent", () => {
                resolve()
            })
            handler.on("error", reject)

            handler.initialize(this.port, this.parser,timeout)
            handler.start(cmd)
        })
    }

    /**
     * Issue a short query command to a specific sensor.
     * 
     * @param {byte} address 
     * @param {byte} command 
     * @param {Array} arg 
     * @param {Number} timeout
     * 
     * @returns {Promise} Promise object represents the result of the issued query
     */
    shortQuery(address, command, arg,timeout) {
        arg = arg ? arg : []
        return new Promise((resolve, reject) => {
            let handler = handlers.sqryHandler()
            let cmd = createPacket(address, command, ...arg)
            handler.on("data", (data) => {
                resolve(transform.decode(data))
            })
            handler.on("error", reject)
            
            handler.initialize(this.port,this.parser,timeout)
            handler.start(cmd)
        })
    }

    LongCommand() {

    }

    /**
     * Issue a long query command to a specific sensor.
     * 
     * @param {byte} address 
     * @param {byte} command 
     * @param {Array} arg 
     * @param {Number} timeout
     * 
     * @returns {Promise} Promise object represents the result of the long query.
     * On resolve the result contains an array with this format 
     * [[header data],[data],[data]... [data...]]
     */
    LongQuery(address, command, arg, timeout) {
        arg = arg ? arg : []
        return new Promise((resolve, reject) => {
            let handler = handlers.lqryHandler()
            let cmd = createPacket(address, command, ...arg)
            let buffer = []
            
            handler.on("dataStart", (data) => {
                buffer.push(transform.decode(data))
            })

            handler.on("data", (data) => {
                buffer.push(transform.decode(data))
            })

            handler.on("done", () => {
                resolve(buffer)
            })

            handler.on("error", reject)

            handler.initialize(this.port, this.parser, timeout)
            handler.start(cmd)
        })
    }

    /**
     * Get a stream interface from a query
     * 
     * @param {byte} address 
     * @param {byte} command 
     * @param {Array} arg 
     * @param {Number} timeout
     * 
     * @returns {ReadableStream} to the result of the query 
     */
    LongQueryStream(address, command, arg, timeout){
        arg = arg ? arg : []
        var stream = new Readable()

        let handler = handlers.lqryHandler()
        let cmd = createPacket(address, command, ...arg)

        handler.on("dataStart",(header) => {
            stream.push(transform.decode(header))
        })

        handler.on("data", (data) => {
            stream.push(transform.decode(data))
        })

        handler.on("done",() => {
            stream.push(null)
        })

        handler.on("error", (err) => {
            stream.emit("error",err)
        })

        handler.initialize(this.port, this.parser, timeout)
        handler.start(cmd)
        return stream
    }

    broadcast(command,arg){
        arg = arg ? arg : []
        let cmd = createPacket(255, command, ...arg)
        return new Promise((resolve,reject) => {
            this.port.write(cmd,resolve)
        })
    }

    close(){
        this.port.close()
    }
}


/**
 * Creates a command packet
 * @param {int} address 
 * @param {int} command 
 * @param {Array} arg 
 * @returns {Array} the packet created [CMDSTRT, encoded data , CMDSTOP]
 */
function createPacket(address, command, ...arg) {
    var encData = transform.encode([address, command, ...arg])
    return [reserved.CMDSTRT, ...encData, reserved.CMDSTOP]
}

