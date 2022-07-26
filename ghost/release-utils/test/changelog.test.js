require('./utils');

const fs = require('fs');
const path = require('path');
const {Changelog} = require('../lib');

describe('Changelog', function () {
    it('can generate changelog.md', function () {
        const changelogPath = path.join(process.cwd(), 'changelog.md');

        const changelog = new Changelog({
            changelogPath: changelogPath,
            folder: process.cwd()
        });

        changelog
            .write({
                githubRepoPath: `https://github.com/TryGhost/Utils`,
                lastVersion: '@tryghost/release-utils@0.6.3'
            })
            .sort()
            .clean();

        try {
            fs.unlinkSync(changelogPath);
            fs.unlinkSync(changelogPath + '.bk');
        } catch (err) {
            should.not.exist(err);
        }
    });
});
