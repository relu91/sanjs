const { Readable } = require("stream")

class FakeSerial extends Readable {
    constructor(){
        super();
        this.data = []
    }
    write(data,cb){
        this.emit("self",data)
        this.data = data;
        if(cb){cb()}
    }

    respond(data){
        this.emit("data",data)
        if (this.stream) {
            this.stream.push(data)
        }
    }

    _read(){
        return this.data;
    }
}

module.exports = FakeSerial