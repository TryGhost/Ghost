const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const security = require('@tryghost/security');
const request = require('@tryghost/request');
const errors = require('@tryghost/errors');
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

    if (limitService.isLimited('customThemes')) {
        // The custom theme limit might consist of only one single theme, so we can't rely on
        // the org alone to determine if the request is allowed or not.
        const noOtherThemesAllowed = limitService.limits.customThemes?.allowlist?.length === 1;
        //TODO: move the organization check to config
        const isNotOfficialThemeRequest = org.toLowerCase() !== 'tryghost';

        const checkThemeLimit = noOtherThemesAllowed || isNotOfficialThemeRequest;

        if (checkThemeLimit) {
            await limitService.errorIfWouldGoOverLimit('customThemes', {value: repo.toLowerCase()});
        }
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
            responseType: 'buffer'
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

        if (e instanceof errors.HostLimitError) {
            // If the error is a HostLimitError, we can assume that the theme name is not allowed
            return Promise.reject(e);
        }

        throw e;
    } finally {
        // clean up tmp dir with downloaded file
        fs.remove(downloadBase);
    }
};

module.exports.installFromGithub = installFromGithub;
