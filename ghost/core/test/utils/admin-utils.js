const fs = require('fs-extra');
const path = require('path');

const adminFiles = [
    'built/admin/index.html',
    'built/admin/assets/ghost.js',
    'built/admin/assets/ghost.css',
    'built/admin/assets/vendor.js',
    'built/admin/assets/vendor.css'
];

module.exports.stubAdminFiles = () => {
    adminFiles.forEach((file) => {
        const filePath = path.resolve(__dirname, '../../core/', file);
        fs.ensureFileSync(filePath);
    });
};
