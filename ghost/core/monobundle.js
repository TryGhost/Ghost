#!/usr/bin/env node

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const concurrently = require('concurrently');
const detectIndent = require('detect-indent');
const detectNewline = require('detect-newline');
const findRoot = require('find-root');
const {flattenDeep} = require('lodash');
const glob = require('glob');

const DETECT_TRAILING_WHITESPACE = /\s+$/;

const jsonFiles = new Map();

class JSONFile {
    /**
     * @param {string} filePath
     * @returns {JSONFile}
     */
    static for(filePath) {
        if (jsonFiles.has(filePath)) {
            return jsonFiles.get(filePath);
        }

        let jsonFile = new this(filePath);
        jsonFiles.set(filePath, jsonFile);

        return jsonFile;
    }

    /**
     * @param {string} filename
     */
    constructor(filename) {
        this.filename = filename;
        this.reload();
    }

    reload() {
        const contents = fs.readFileSync(this.filename, {encoding: 'utf8'});

        this.pkg = JSON.parse(contents);
        this.lineEndings = detectNewline(contents);
        this.indent = detectIndent(contents).amount;

        let trailingWhitespace = DETECT_TRAILING_WHITESPACE.exec(contents);
        this.trailingWhitespace = trailingWhitespace ? trailingWhitespace : '';
    }

    write() {
        let contents = JSON.stringify(this.pkg, null, this.indent).replace(/\n/g, this.lineEndings);

        fs.writeFileSync(this.filename, contents + this.trailingWhitespace, {encoding: 'utf8'});
    }
}

/**
 * @param {object} packageJson
 */
function getPackages(packageJson) {
    if (!('workspaces' in packageJson)) {
        return null;
    }
    const {workspaces} = packageJson;
    if (Array.isArray(workspaces)) {
        return workspaces;
    }
    return workspaces.packages || null;
}

/**
 * @param {string} from
 * @returns {string[]}
 */
function getWorkspaces(from) {
    const root = findRoot(from, (dir) => {
        const pkg = path.join(dir, 'package.json');
        return fs.existsSync(pkg) && getPackages(require(pkg)) !== null;
    });

    const packages = getPackages(require(path.join(root, 'package.json')));
    return flattenDeep(packages.map(name => glob.sync(path.join(root, `${name}/`))));
}

(async () => {
    const cwd = process.cwd();
    const nearestPkgJson = findRoot(cwd);
    console.log('nearestPkgJson', nearestPkgJson);
    const pkgInfo = JSONFile.for(path.join(nearestPkgJson, 'package.json'));

    if (pkgInfo.pkg.name !== 'ghost') {
        console.log('This script must be run from the `ghost` npm package directory');
        process.exit(1);
    }

    const bundlePath = './components';
    if (!fs.existsSync(bundlePath)){
        fs.mkdirSync(bundlePath);
    }

    const workspaces = getWorkspaces(cwd)
        .filter(w => !w.startsWith(cwd) && fs.existsSync(path.join(w, 'package.json')))
        .filter(w => !w.includes('apps/'))
        .filter(w => !w.includes('ghost/admin'));

    console.log('workspaces', workspaces);
    console.log('\n-------------------------\n');

    const packagesToPack = [];

    for (const w of workspaces) {
        const workspacePkgInfo = JSONFile.for(path.join(w, 'package.json'));

        if (!workspacePkgInfo.pkg.private) {
            continue;
        }

        workspacePkgInfo.pkg.version = pkgInfo.pkg.version;
        workspacePkgInfo.write();

        const slugifiedName = workspacePkgInfo.pkg.name.replace(/@/g, '').replace(/\//g, '-');
        const packedFilename = `file:` + path.join(bundlePath, `${slugifiedName}-${workspacePkgInfo.pkg.version}.tgz`);

        if (pkgInfo.pkg.dependencies[workspacePkgInfo.pkg.name]) {
            console.log(`[${workspacePkgInfo.pkg.name}] dependencies override => ${packedFilename}`);
            pkgInfo.pkg.dependencies[workspacePkgInfo.pkg.name] = packedFilename;
        }

        if (pkgInfo.pkg.devDependencies[workspacePkgInfo.pkg.name]) {
            console.log(`[${workspacePkgInfo.pkg.name}] devDependencies override => ${packedFilename}`);
            pkgInfo.pkg.devDependencies[workspacePkgInfo.pkg.name] = packedFilename;
        }

        if (pkgInfo.pkg.optionalDependencies[workspacePkgInfo.pkg.name]) {
            console.log(`[${workspacePkgInfo.pkg.name}] optionalDependencies override => ${packedFilename}`);
            pkgInfo.pkg.optionalDependencies[workspacePkgInfo.pkg.name] = packedFilename;
        }

        console.log(`[${workspacePkgInfo.pkg.name}] resolution override => ${packedFilename}\n`);
        pkgInfo.pkg.resolutions[workspacePkgInfo.pkg.name] = packedFilename;

        packagesToPack.push(w);
    }

    pkgInfo.write();

    const {result} = concurrently(packagesToPack.map(w => ({
        name: w,
        cwd: w,
        command: 'npm pack --pack-destination ../core/components'
    })));

    try {
        await result;
    } catch (e) {
        console.error(e);
        throw e;
    }

    const filesToCopy = [
        'README.md',
        'LICENSE',
        'PRIVACY.md',
        'yarn.lock'
    ];

    for (const file of filesToCopy) {
        console.log(`copying ../../${file} to ${file}`);
        fs.copyFileSync(path.join('../../', file), file);
    }
})();
