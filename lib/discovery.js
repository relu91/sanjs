module.exports.discover = async (sanjs,timeout = 100, progress) => {
    progress = progress ? progress : () => {}

    var sensors = []
    for (let index = 0; index < 255; index++) {
        try {
            let data = await sanjs.shortQuery(index, 3, [], timeout)
            if (data[0] === 0) {
                sensors.push(index)
            }
        } catch (error) { /* skip */ }
        progress(index,sensors.length)
    }
    return sensors
}