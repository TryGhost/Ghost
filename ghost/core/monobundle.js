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
 * Read workspace package globs from pnpm-workspace.yaml.
 * @param {string} dir
 * @returns {string[]|null}
 */
function getPackages(dir) {
    const pnpmWorkspace = path.join(dir, 'pnpm-workspace.yaml');
    if (!fs.existsSync(pnpmWorkspace)) {
        return null;
    }

    const content = fs.readFileSync(pnpmWorkspace, 'utf8');
    const packages = [];
    let inPackages = false;
    for (const line of content.split('\n')) {
        if (line.startsWith('packages:')) {
            inPackages = true;
            continue;
        }
        if (inPackages) {
            const match = line.match(/^\s+-\s+['"]?([^'"]+)['"]?\s*$/);
            if (match) {
                packages.push(match[1]);
            } else if (/^\S/.test(line)) {
                break;
            }
        }
    }

    return packages.length > 0 ? packages : null;
}

/**
 * @param {string} from
 * @returns {string[]}
 */
function getWorkspaces(from) {
    const root = findRoot(from, (dir) => {
        return getPackages(dir) !== null;
    });

    const packages = getPackages(root);
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
        .filter(w => !w.includes('/admin/'))
        .filter(w => !w.includes('/e2e/'));

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
        if (!pkgInfo.pkg.resolutions) {
            pkgInfo.pkg.resolutions = {};
        }
        pkgInfo.pkg.resolutions[workspacePkgInfo.pkg.name] = packedFilename;

        packagesToPack.push(w);
    }

    // Copy pnpm.overrides from root package.json so production installs
    // pin the same transitive dependency versions as the workspace.
    const rootPkgPath = path.join(findRoot(path.dirname(nearestPkgJson)), 'package.json');
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    if (rootPkg.pnpm?.overrides) {
        const workspaceNames = new Set(workspaces
            .map((w) => {
                const wpkg = path.join(w, 'package.json');
                return fs.existsSync(wpkg) ? JSON.parse(fs.readFileSync(wpkg, 'utf8')).name : null;
            })
            .filter(Boolean));

        const filteredOverrides = {};
        for (const [key, value] of Object.entries(rootPkg.pnpm.overrides)) {
            if (!workspaceNames.has(key)) {
                filteredOverrides[key] = value;
            }
        }

        if (!pkgInfo.pkg.pnpm) {
            pkgInfo.pkg.pnpm = {};
        }
        pkgInfo.pkg.pnpm.overrides = {...filteredOverrides, ...pkgInfo.pkg.pnpm.overrides};
    }

    // Copy onlyBuiltDependencies so native addons can run install scripts.
    if (rootPkg.pnpm?.onlyBuiltDependencies) {
        if (!pkgInfo.pkg.pnpm) {
            pkgInfo.pkg.pnpm = {};
        }
        pkgInfo.pkg.pnpm.onlyBuiltDependencies = rootPkg.pnpm.onlyBuiltDependencies;
    }

    // Copy packageManager so corepack uses the correct pnpm version.
    if (rootPkg.packageManager) {
        pkgInfo.pkg.packageManager = rootPkg.packageManager;
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
        'pnpm-lock.yaml',
        'pnpm-workspace.yaml',
        '.npmrc'
    ];

    for (const file of filesToCopy) {
        console.log(`copying ../../${file} to ${file}`);
        fs.copyFileSync(path.join('../../', file), file);
    }
})();
