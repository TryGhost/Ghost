const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

// Read the Dockerfile
const dockerfilePath = '.docker/Dockerfile';
const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');

const pathsToExclude = [
    'ghost/core/content/themes',
    'ghost/core/test/utils/fixtures/themes',
    'package.json'
];

// Find all package.json files
function findPackageJsonFiles(dir) {
    let results = [];
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !fullPath.includes('node_modules')) {
            results = results.concat(findPackageJsonFiles(fullPath));
        } else if (file === 'package.json') {
            // Skip package.json files in themes and test fixtures
            if (pathsToExclude.some(exclude => fullPath.startsWith(exclude))) {
                continue;
            }
            results.push(fullPath);
        }
    }
    
    return results;
}

// Get all package.json files
const packageJsonFiles = findPackageJsonFiles('.');

// Generate COPY lines for each package.json
const copyLines = packageJsonFiles.map(file => {
    // Convert absolute path to relative path from Dockerfile context
    const relativePath = path.relative('.', file);
    const dirPath = path.dirname(relativePath);
    return `COPY ${relativePath} ${dirPath}/package.json`;
}).join('\n');

// Insert COPY lines after the yarn.lock copy command
const existingLines = dockerfileContent.split('\n');
const newCopyLines = copyLines.split('\n');

// Filter out any COPY lines that already exist
const uniqueCopyLines = newCopyLines.filter(line => !existingLines.includes(line));

const updatedContent = dockerfileContent.replace(
    /# Copy all package\.json files\n/,
    match => uniqueCopyLines.length ? `\n${match}${uniqueCopyLines.join('\n')}` : match
);

// Write the updated Dockerfile
fs.writeFileSync('.docker/Dockerfile', updatedContent);
