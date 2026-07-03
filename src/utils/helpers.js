function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function toHex(str) {
    return Buffer.from(str, 'utf8').toString('hex');
}

function fromHex(hex) {
    return Buffer.from(hex, 'hex').toString('utf8');
}

function generateTimestampParam() {
    const now = Math.floor(Date.now() / 1000);
    const earlier = now - Math.floor(Math.random() * 3600);
    return `${earlier}~${now}`;
}

module.exports = {
    makeid,
    toHex,
    fromHex,
    generateTimestampParam
};
