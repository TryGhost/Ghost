require('./utils');

const path = require('path');
const {Changelog} = require('../lib');

describe('Changelog', function () {
    it('can generate changelog.md', function () {
        const changelog = new Changelog({
            changelogPath: path.join(process.cwd(), 'changelog.md'),
            folder: process.cwd()
        });

        changelog
            .write({
                githubRepoPath: `https://github.com/TryGhost/Ghost-Utils`,
                lastVersion: '@tryghost/release-utils@0.6.3'
            })
            .sort()
            .clean();
    });
});
