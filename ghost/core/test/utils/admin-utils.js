const fs = require('fs-extra');
const path = require('path');

const adminFiles = [
    'built/admin/development/index.html',
    'built/admin/development/assets/ghost.js',
    'built/admin/development/assets/ghost.css',
    'built/admin/development/assets/vendor.js',
    'built/admin/development/assets/vendor.css'
];

module.exports.stubAdminFiles = () => {
    adminFiles.forEach((file) => {
        const filePath = path.resolve(__dirname, '../../core/', file);
        fs.ensureFileSync(filePath);
    });
};
