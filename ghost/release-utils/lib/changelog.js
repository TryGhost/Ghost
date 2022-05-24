const execa = require('execa');
const _ = require('lodash');

const localUtils = require('./utils');

class Changelog {
    constructor(options = {}) {
        localUtils.checkMissingOptions(options,
            'folder',
            'changelogPath'
        );

        this.changelogPath = options.changelogPath;
        this.folder = options.folder;
    }

    write(options = {}) {
        localUtils.checkMissingOptions(options,
            'githubRepoPath',
            'lastVersion'
        );

        let sign = '>';

        if (options.append) {
            sign = '>>';
        }

        const commands = [
            `git log --no-merges --pretty=tformat:'%at * [%h](${options.githubRepoPath}/commit/%h) %s - %an' ${options.lastVersion}.. | sed 's/(#[0-9]{1,})//g' ${sign} ${this.changelogPath}`
        ];

        _.each(commands, (command) => {
            execa.sync(command, {cwd: options.folder || this.folder, shell: true});
        });

        return this;
    }

    sort() {
        execa.sync(`sort -r ${this.changelogPath} -o ${this.changelogPath}`, {cwd: this.folder, shell: true});

        return this;
    }

    clean() {
        execa.sync(`sed -i.bk -E 's/^[0-9]{10} //g' ${this.changelogPath}`, {cwd: this.folder, shell: true});

        return this;
    }
}

module.exports = Changelog;
