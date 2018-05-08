# SANjs

A simple library to interect with Sensor Area Network devices. 

## Usage

Simple command:
```javascript
const sanjs = require("sanjs")

let SAN = sanjs("/dev/ttyUSB0")

SAN.shortCommand(1,13,[1,2,3]).then(() => {
        console.log("OK")
    }).catch((error) => {
        console.error(error)
    }).then(SAN.close.bind(SAN))
```