const fs = require('fs-extra');
const path = require('path');

const clientFiles = [
    'server/web/admin/views/default.html',
    'built/assets/ghost.js',
    'built/assets/ghost.css',
    'built/assets/vendor.js',
    'built/assets/vendor.css'
];

module.exports.stubClientFiles = () => {
    clientFiles.forEach((file) => {
        const filePath = path.resolve(__dirname, '../../core/', file);
        fs.ensureFileSync(filePath);
    });
};
