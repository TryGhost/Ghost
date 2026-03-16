module.exports = function dedent(str) {
    let lines = str.split(/\n/);
    return lines.map(line => line.replace(/^\s+/gm, '')).join('').trim();
};
