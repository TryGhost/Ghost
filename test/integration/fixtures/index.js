const path = require('path');

// Helpers
const getPath = function (filename) {
    return path.join(__dirname, filename);
};

module.exports = {
    inputJpeg: getPath('saw.jpg'),
    inputPng: getPath('saw.png'),
    inputWebp: getPath('tree.webp')
};