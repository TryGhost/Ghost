const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const security = require('@tryghost/security');
const exporter = require('../../data/exporter');
const membersService = require('../../services/members');
const getPostServiceInstance = require('../../services/posts/posts-service-instance');
const routeSettings = require('../../services/route-settings');
const customRedirects = require('../../services/custom-redirects');
const {serializeToYaml} = require('../../services/custom-redirects/redirect-config-parser');
const themeService = require('../../services/themes');
const themeList = require('../../services/themes/list');
const {SiteExporter, EXPORT_COMPONENTS} = require('../../services/exports/site-exporter');
const {getExportFileName} = require('./utils/csv-export-filename');
const {rejectAdminApiRestrictedFieldsTransformer} = require('./utils/api-filter-utils');
const {createCSVTransform: createMembersCSVTransform} = require('./utils/serializers/output/members-csv-transform');
const {createCSVTransform: createPostsCSVTransform} = require('./utils/serializers/output/posts-csv-transform');
const {pipeline} = require('stream');

const postsService = getPostServiceInstance();

const messages = {
    noComponentsSelected: 'No export components selected'
};

/**
 * Pipes export rows through their CSV transform. `pipeline` (rather than
 * `.pipe`) so a source error destroys the transform too — the zip stream
 * then errors instead of hanging.
 *
 * @param {string} label - Which export the stream belongs to, for the error log
 * @param {NodeJS.ReadableStream} rows
 * @param {import('stream').Transform} transform
 * @returns {NodeJS.ReadableStream}
 */
function toCSVStream(label, rows, transform) {
    pipeline(rows, transform, (err) => {
        if (err) {
            logging.error(new errors.InternalServerError({
                message: `Site export: the ${label} stream failed mid-export`,
                err
            }));
        }
    });
    return transform;
}

/**
 * Zips one theme into its own temp directory. The caller (SiteExporter)
 * streams the file into the archive and runs `cleanup` when the archive
 * closes.
 *
 * @param {string} name - theme name
 * @returns {Promise<{zipPath: string, cleanup(): Promise<void>}>}
 */
async function zipThemeToTempFile(name) {
    const tmpDir = path.join(os.tmpdir(), `ghost-export-${security.identifier.uid(10)}`);
    await fs.ensureDir(tmpDir);

    try {
        const zipPath = path.join(tmpDir, `${name}.zip`);
        await themeService.api.zipToFile(name, zipPath);
        return {zipPath, cleanup: () => fs.remove(tmpDir)};
    } catch (err) {
        await fs.remove(tmpDir);
        throw err;
    }
}

function createSiteExporter() {
    return new SiteExporter({
        // Same shape the `/db/` download produces, so the file stays importable
        exportContent: async () => ({db: [await exporter.doExport()]}),
        // `limit: 'all'` keeps both CSV exporters on their unfiltered
        // streaming path — without it the members exporter materialises every
        // id into a WHERE IN and the posts exporter caps at its default page
        exportMembersCSV: async () => toCSVStream(
            'members',
            await membersService.export({limit: 'all'}),
            createMembersCSVTransform()
        ),
        // Same restricted-fields guard the `/posts/export/` endpoint applies
        exportPostAnalyticsCSV: async () => toCSVStream(
            'post analytics',
            await postsService.export({limit: 'all', mongoTransformer: rejectAdminApiRestrictedFieldsTransformer}),
            createPostsCSVTransform()
        ),
        listThemes: () => Object.keys(themeList.getAll()),
        zipTheme: zipThemeToTempFile,
        exportRoutesYaml: () => routeSettings.api.download(),
        exportRedirectsYaml: async () => serializeToYaml(await customRedirects.api.getAll())
    });
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'exports',

    download: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'components'
        ],
        validation: {
            options: {
                components: {
                    values: [...EXPORT_COMPONENTS]
                }
            }
        },
        // A site export contains everything a database export contains, so
        // the same Owner/Administrator-only gate applies
        permissions: {
            docName: 'db',
            method: 'exportContent'
        },
        query(frame) {
            // Absent means everything; explicitly empty means nothing selected
            const components = frame.options.components ?? [...EXPORT_COMPONENTS];

            if (components.length === 0) {
                throw new errors.ValidationError({
                    message: messages.noComponentsSelected
                });
            }

            return {
                archive: createSiteExporter().createArchive(components),
                filename: getExportFileName('export', 'zip')
            };
        }
    }
};

module.exports = controller;
