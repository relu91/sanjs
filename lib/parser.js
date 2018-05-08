"use strict"
const Buffer = require("safe-buffer").Buffer
const Transform = require("stream").Transform
const reserved = require("./reserved")

const WAIT = 0
const WAITCMDSTP = reserved.CMDSTOP
const WAITDATSTP = reserved.DATSTOP

class CommandPacketParser extends Transform {

    constructor(options) {
        options = options || {}
        super(options)
        this.buffer = Buffer.alloc(0)
        this.state = WAIT
    }

    _transform(chunk, encoding, cb) {
        switch (this.state) {
            case WAIT:
                this.state = wait(chunk,this)
                break
            case WAITCMDSTP:
                this.state = buffering(chunk,this,reserved.CMDSTOP)
                break
            case WAITDATSTP:
                this.state = buffering(chunk,this,reserved.DATSTOP)
                break
            default:
                break
        }
        cb()
    }

    _flush(cb) {
        //Ignore buffered data, it doesn't contain a valid command
        this.buffer = Buffer.alloc(0)
        cb()
    }
}

function wait(chunk,transf) {
    for (let i = 0; i < chunk.length; i++) {
        switch (chunk[i]) {
            case reserved.CMDSTRT:
                //consume data
                return buffering(chunk.slice(i), transf, reserved.CMDSTOP)
            case reserved.DATSTRT:
                //consume data
                return buffering(chunk.slice(i), transf, reserved.DATSTOP)                                
            case reserved.CMDACKN:
            case reserved.NOTACKN:
            case reserved.DATACKN:
                transf.push(Buffer.from([chunk[i]]))
                break
            default:
                break
        }
    }
    return WAIT
}

function buffering(chunk,transf,keyword) {
    var i = 0
    for (; i < chunk.length && chunk[i] !== keyword; i++);
    
    if (chunk[i] === keyword) {
        let data = chunk.slice(0,i+1)
        data = Buffer.concat([transf.buffer,data])
        transf.push(data)
        transf.buffer = Buffer.alloc(0)
        let tail = chunk.slice(i+2)
        return wait(tail,transf)
    }

    transf.buffer = Buffer.concat([transf.buffer, chunk])
    return keyword
}

module.exports = CommandPacketParser