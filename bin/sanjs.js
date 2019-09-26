#!/usr/bin/env node
/*eslint no-console: off*/

const sanj = require("../index")
const cli = require("commander")
const chalk = require("chalk")
const ProgressBar = require("progress")
const SerialPort = require("serialport")
const utils = require("./utils")
const debug = require("debug")



cli.on("command:*",(cmd) => {
    console.log("Invalid command",cmd[0])
    cli.help() 
})
cli
    .command("discover <port>")
    .description("Discover all SAN sensors connected")
    .alias("d")
    .action(discover)
cli
    .command("scmd <port> <addrs> <code> [data...]")
    .description("Send a short command to a sensor address")
    .alias("sc")
    .action(scmd)
cli
    .command("broadcast <port> <code> [data...]")
    .description("Send a broadcast command to all sensors")
    .alias("b")
    .action(broadcast)
cli
    .command("sqry <port> <addrs> <code> [data...]")
    .description("Send a short query to a sensor address")
    .alias("sq")
    .action(sqry)
cli
    .command("lqry <port> <addrs> <code> [data...]")
    .description("Send a long query to a sensor address")
    .alias("lq")
    .action(lqry)
cli
    .command("list")
    .description("List all known SAN common commands")
    .alias("ls")
    .action(list)
cli.boud = 500000
cli
    .option("-q, --quiet","suppres all info output")
    .option("-d, --debug","show the debug output")
    .option("-b, --boud <boud>","set the boudrate of the serial port. Default: 500000")
cli.parse(process.argv)

if (cli.args.length < 1) {
    console.log("No command; see usage:")
    cli.help()
}

function scmd(port,address,cmdcode,data,cmd) {
    cmd.parent.debug && debug.enable("handler")
    let quiet = cmd.parent.quiet
    let sanCmd = utils.toCommand(cmdcode)
    
    utils.print(quiet)
    utils.print(quiet, chalk.bold(chalk.green("Sending"), utils.prettyStrCmd(cmdcode),
        "command to device",chalk.yellow(address)),"on port",chalk.bold(port))
    
    const serial = new SerialPort(port, {
        baudRate: 500000
    })

    const SAN = sanj(serial)
    SAN.shortCommand(address,sanCmd,data).then(() => {
        utils.print(quiet,chalk.green.bold("Ok"))
        utils.print(quiet)
    }).catch((error) => {
        utils.print(quiet,chalk.bgRed("Cannot connect"),error)
    }).then(SAN.close.bind(SAN))
}

function broadcast(port, cmdcode, data,cmd) {
    cmd.parent.debug && debug.enable("handler")
    let quiet = cmd.parent.quiet
    let sanCmd = utils.toCommand(cmdcode)

    utils.print(quiet)
    utils.print(quiet, chalk.bold(chalk.green("Sending"), utils.prettyStrCmd(cmdcode),
        "command to all devices", "on port", chalk.bold(port)))

    const serial = new SerialPort(port, {
        baudRate: 500000
    })

   
    const SAN = sanj(serial)
    SAN.broadcast(sanCmd, data).then(SAN.close.bind(SAN))
}

function sqry(port, address, cmdcode, data, cmd) {
    cmd.parent.debug && debug.enable("handler")
    let quiet = cmd.parent.quiet
    let sanCmd = utils.toCommand(cmdcode)

    utils.print(quiet)
    utils.print(quiet, chalk.bold(chalk.green("Sending"), utils.prettyStrCmd(cmdcode), 
        "command to device", chalk.yellow(address)), "on port", chalk.bold(port))

    const serial = new SerialPort(port, {
        baudRate: parseInt(cmd.parent.boud)
    })

    const SAN = sanj(serial)
    SAN.shortQuery(address,sanCmd,data).then((result) => {
        utils.print(quiet, chalk.green.bold("Ok"))
        utils.print(quiet)
        utils.print(false, chalk.bold("Data"),result)
        utils.print(quiet)
    }).catch((error) => {
        utils.print(quiet, chalk.bgRed("Cannot connect"), error)
    }).then(SAN.close.bind(SAN))
}

function lqry(port, address, cmdcode, data, cmd) {
    cmd.parent.debug && debug.enable("handler")
    let quiet = cmd.parent.quiet
    let sanCmd = utils.toCommand(cmdcode)

    utils.print(quiet)
    utils.print(quiet, chalk.bold(chalk.green("Sending"), utils.prettyStrCmd(cmdcode), 
        "command to device", chalk.yellow(address)), "on port", chalk.bold(port))

    const serial = new SerialPort(port, {
        baudRate: parseInt(cmd.parent.boud)
    })
    //Patch to print all buffer
    Buffer.prototype.toString = utils.fullBufferToString
    
    const SAN = sanj(serial)
    SAN.LongQuery(address,sanCmd,data).then((result) => {
        let bold = quiet ? (data) => data : chalk.bold
        utils.print(quiet, chalk.green.bold("Ok"))
        utils.print(quiet)
        
        result.forEach(buffer => {
            process.stdout.write(bold("Data"))
            process.stdout.write(" ")
            for (const b of buffer) {
                process.stdout.write(b.toString(16))
                process.stdout.write(" ")
            }
            process.stdout.write("\n")
        })

        utils.print(quiet)
    }).catch((error) => {
        utils.print(quiet, chalk.bgRed("Cannot connect"), error)
    }).then(SAN.close.bind(SAN))
}

function list() {
    for (const cmd in utils.KnownCmds) {
        if (utils.KnownCmds.hasOwnProperty(cmd)) {
            const element = utils.KnownCmds[cmd]
            let out = ""+cmd
            utils.print(false,chalk.bold(out.padEnd(12)),"=",element)
        }
    }
}

function discover(port,cmd) {
    cmd.parent.debug && debug.enable("handler")
    let quiet = cmd.parent.quiet
    var chain = Promise.resolve()
    const serial = new SerialPort(port, {
        baudRate: parseInt(cmd.parent.boud)
    })
    utils.print(quiet)
    utils.print(quiet,chalk.green.bold("Start"), "discovering on port: ",chalk.bold(port))
    if(!quiet)
        var bar = new ProgressBar(chalk.bold("Searching [:bar] :percent . Found:".padStart(2),chalk.yellow(":count")), {
            complete: chalk.bgGreen(" "),
            incomplete: " ",
            width: 20,
            total: 255
        })
    const test = sanj(serial)
    var sensors = []
    for (let index = 0; index < 255; index++) {
        chain = chain.then(() => {
            return test.shortQuery(index, 3,[],20).then((data) => {
                if (data[0] === 0) {
                    sensors.push(index)
                }
            }).catch(() => {}).then(() => {
                if(!quiet)
                    bar.tick(1,{"count": sensors.length})
            })
        })

    }
    chain.catch((e) => {
        console.error(e)
    }).then(() => {
        utils.print(quiet)
        utils.print(quiet,"Sensor addresses found:")
        printSensors(sensors,quiet)
        utils.print(quiet)        
        test.close()
    })
}

function printSensors(sensors,quiet) {
    let bold = quiet ? (data) => data : chalk.bold
    let bgRed = quiet ? (data) => data : chalk.bgRed

    if(sensors.length < 1 ){
        utils.print(false,bgRed("No sensor"))
    }
    
    sensors.length && process.stdout.write("  "+bold(sensors[0]))
    for (let i = 1; i < sensors.length; i++) {
        const element = sensors[i]
        process.stdout.write("--")
        process.stdout.write(""+bold(element))
    }
    utils.print(quiet)
}

