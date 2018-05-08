exports.encode = data => {
    data = Uint8Array.from(data)
    var result = Buffer.alloc(data.length * 2)

    for (let i = 0; i < data.length; i++) {
        const L = data[i] % 16
        const H = Math.floor(data[i]/16)
        for (let j = 0; j < 4; j++) {
            result[2 * i] += (2 - ((L >> j) & 1)) << (2 * j)
            result[2 * i + 1] += (2 - ((H >> j) & 1)) << (2 * j)                 
        }
    }
    return result
}

exports.decode = data => {
    var result = Buffer.alloc(data.length / 2)
    for (let i = 0; i < data.length/2; i++) {
        const L = data[2*i]
        const H = data[2*i+1]
        for (let j = 0; j < 4; j++) {
            result[i] += ((L >> (2 * j)) & 1) << j
            result[i] += ((H >> (2 * j)) & 1) << (j + 4)
        }
    }
    return result
}