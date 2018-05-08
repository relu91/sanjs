/*eslint no-console: off*/
const KnownCmds = Object.freeze(
    {
        CMDGO: 0, // Exectute command
        CMDTEST: 1,       // Exectute selftest
        CMDRESET: 2,      // Exectute reset
        CMDSETADD: 3,     // Set local address
        CMDSETTRGM: 4,    // Set trigger mode
        CMDSETTHRMC1: 5,  // Set threshold mode for CH1
        CMDSETTHRMC2: 6,  // Set threshold mode for CH2
        CMDSETTHRMC3: 7,  // Set threshold mode for CH3
        CMDSETSMP: 8,     // Set total sample number
        CMDSETPRE: 9,     // Set pretrigger sample number
        CMDSETTHRVC1: 10, // Set threshold levels for CH1
        CMDSETTHRVC2: 11, // Set threshold levels for CH2
        CMDSETTHRVC3: 12, // Set threshold levels for CH3
        CMDGETVREF: 13,   // Get the internal Vref
        CMDSETDAC: 14,    // Set the DAC output voltage
        CMDSETTIM: 15,    // Set the timer period
        CMDGETDATA: 16,   // Get the acquired data
        CMDGETANGLE: 17,  // Get the processed data
        CMDSETGRANGE: 20, // Set the maximum G range
        CMDSETRES: 21,    // Set data resolution
        CMDSETOPMODE: 22, // Set operating mode
        CMDECHO: 255      // Echo the incoming message
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
    return KnownCmds.hasOwnProperty(cmd) ? cmd + "(" + KnownCmds[cmd] + ")" : cmd
}