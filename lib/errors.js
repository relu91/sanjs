
class TimeoutError extends Error {
    constructor(timeout){
        super(`Packet timeout: ${timeout}ms`)
    }
}

module.exports.timeout = TimeoutError