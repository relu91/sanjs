const EventEmitter = require("events")

class FakeSerial extends EventEmitter {

    write(data,cb){
        this.emit("self",data)
       
        if(cb){cb()}
    }

    respond(data){
        this.emit("data",data)
        if (this.stream) {
            this.stream.push(data)
        }
    }

    pipe(stream){
        this.stream = stream
    }
}

module.exports = FakeSerial