const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const yaml = require('yaml');

// Read and parse the compose.yml file
const composePath = path.join(__dirname, '../../compose.yml');
const composeContent = fs.readFileSync(composePath, 'utf8');
// Use yaml.parseDocument to preserve comments
const composeDoc = yaml.parseDocument(composeContent);
const composeData = composeDoc.toJSON();

// Ensure the compose file has volumes section
assert.ok(composeData.volumes, 'compose.yml must have a volumes section');

// Get all workspace packages that need volumes
const packageJson = require('../../package.json');
assert.ok(packageJson.workspaces, 'package.json must have workspaces defined');

// Exclude:
// /ghost/web-analytics
// /ghost/extract-api-key

const packagesToExclude = [
    'web-analytics',
    'extract-api-key',
];

// Create volume names for each workspace
const volumes = packageJson.workspaces
    .flatMap(pattern => {
        // Remove glob patterns and get base paths
        const basePath = pattern.replace(/\/\*$/, '');
        try {
            return fs.readdirSync(path.join(__dirname, '../../', basePath))
                .filter(dir => !dir.startsWith('.'))
                .filter(dir => !packagesToExclude.includes(dir))
                .filter(dir => {
                    const fullPath = path.join(__dirname, '../../', basePath, dir);
                    return fs.statSync(fullPath).isDirectory();
                })
                .map(dir => {
                    return {
                        name: `node_modules_${basePath}_${dir}`.toLowerCase(), 
                        path: `${basePath}/${dir}`
                    };
                });
        } catch (err) {
            console.error(`Error reading directory ${basePath}:`, err);
            return [];
        }
    });

// Add volumes to compose data if they don't exist
volumes.forEach(volume => {
    if (!composeDoc.get('volumes').has(volume.name)) {
        composeDoc.setIn(['volumes', volume.name], {});
    }
});

// Add volume mounts to ghost service
assert.ok(composeDoc.getIn(['services', 'ghost', 'volumes']), 'compose.yml must have ghost service with volumes');

volumes.forEach(volume => {
    const mountPath = `/home/ghost/${volume.path}`;
    const volumeMount = `${volume.name}:${mountPath}/node_modules:delegated`;
    
    const existingVolumes = composeDoc.getIn(['services', 'ghost', 'volumes']);
    if (!existingVolumes.items.some(item => item.value === volumeMount)) {
        existingVolumes.add(volumeMount);
    }
});

// Write back to compose.yml, preserving comments
fs.writeFileSync(composePath, String(composeDoc));
