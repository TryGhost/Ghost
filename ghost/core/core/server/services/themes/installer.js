const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const security = require('@tryghost/security');
const request = require('@tryghost/request');
const errors = require('@tryghost/errors/lib/errors');
const limitService = require('../../services/limits');
const {setFromZip} = require('./storage');

const messages = {
    repoDoesNotExist: 'Supplied GitHub theme does not exist or is inaccessible'
};

/**
 *
 * @param {String} ref - theme reference in "Org/RepoName" format
 * @returns {Promise<any>}
 */
const installFromGithub = async (ref) => {
    const [org, repo] = ref.toLowerCase().split('/');

    //TODO: move the organization check to config
    if (limitService.isLimited('customThemes') && org.toLowerCase() !== 'tryghost') {
        await limitService.errorIfWouldGoOverLimit('customThemes', {value: repo.toLowerCase()});
    }

    // omit /:ref so we fetch the default branch
    const zipUrl = `https://api.github.com/repos/${org}/${repo}/zipball`;
    const zipName = `${repo}.zip`;

    // store zip in a unique temporary folder to avoid conflicts
    const downloadBase = path.join(os.tmpdir(), security.identifier.uid(10));
    const downloadPath = path.join(downloadBase, zipName);

    await fs.ensureDir(downloadBase);

    try {
        // download zip file
        const response = await request(zipUrl, {
            followRedirect: true,
            headers: {
                accept: 'application/vnd.github.v3+json'
            },
            encoding: null
        });

        await fs.writeFile(downloadPath, response.body);

        // install theme from zip
        const zip = {
            path: downloadPath,
            name: zipName
        };
        const {theme, themeOverridden} = await setFromZip(zip);

        return {theme, themeOverridden};
    } catch (e) {
        if (e.statusCode && e.statusCode === 404) {
            return Promise.reject(new errors.BadRequestError({
                message: messages.repoDoesNotExist,
                context: zipUrl
            }));
        }

        throw e;
    } finally {
        // clean up tmp dir with downloaded file
        fs.remove(downloadBase);
    }
};

module.exports.installFromGithub = installFromGithub;
