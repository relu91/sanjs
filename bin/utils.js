/*eslint no-console: off*/
const KnownCmds = Object.freeze(
    {
        CMDGO      : 0, //Exectute command
        CMDTEST    : 1, //Exectute selftest
        CMDSYNC    : 2, //Set localtime to 0
        CMDGETVREF : 3, //Get the internal Vref

        // Data acquisition system
        CMDSETTRGM    : 4,  //Set trigger mode
        CMDSETCHEN    : 5,  //Set channel enable
        CMDSETTHRM    : 6,  //Set threshold mode
        CMDSETTHRV    : 7,  //Set threshold levels
        CMDSETSMP     : 8,  //Set total sample number
        CMDSETPRE     : 9,  //Set pretrigger sample number
        CMDSETTRGTOUT : 10, //Set the trigger timeout
        CMDGETDATA    : 11, //Get the acquired data
        CMDHALT       : 12, //Stop the acquisition system

        // SAN basic commands
        CMDRESET   : 250, // Exectute reset
        CMDSETADD  : 251, // Set local address
        CMDCHAIN   : 252, // Exectute reset
        CMDSETNEXT : 253, // Set local address
        CMDSETPREV : 254, // Exectute reset
        CMDECHO    : 255, // Echo the incoming message
    }
)

module.exports.KnownCmds = KnownCmds

module.exports.print = function (quiet, ...outputs) {
    if (!quiet) {
        console.log("".padStart(2), ...outputs)
    }
}

module.exports.toCommand = function (cmd) {
    return !isNaN(cmd) ? cmd : KnownCmds[cmd]
}

module.exports.prettyStrCmd = function (cmd) {
    return Object.prototype.hasOwnProperty.call(KnownCmds,cmd) ? cmd + "(" + KnownCmds[cmd] + ")" : cmd
}