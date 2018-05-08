const SerialPort = require("serialport")
const transform = require("./transform")
const CommandPacketParser = require("./parser")
const reserved = require("./reserved")
const handlers = require("./handlers")
var Readable = require("stream").Readable



module.exports = (port) => {
    return new SensorAerea(port)
}

class SensorAerea {

    constructor(port) {
        if (typeof (port) === "string") {
            port = new SerialPort(port, {baudRate: 500000})
        }
        this.port = port
        this.parser = new CommandPacketParser()    
        this.port.pipe(this.parser)     
    }

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

    close(){
        this.port.close()
    }
}



function createPacket(address, command, ...arg) {
    var encData = transform.encode([address, command, ...arg])
    return [reserved.CMDSTRT, ...encData, reserved.CMDSTOP]
}

