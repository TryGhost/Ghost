const exporter = require('../../data/exporter');
const membersService = require('../../services/members');
const getPostServiceInstance = require('../../services/posts/posts-service-instance');
const routeSettings = require('../../services/route-settings');
const customRedirects = require('../../services/custom-redirects');
const {serializeToYaml} = require('../../services/custom-redirects/redirect-config-parser');
const themeList = require('../../services/themes/list');
const {SiteExporter, EXPORT_COMPONENTS} = require('../../services/exports/site-exporter');
const {zipThemeToBuffer} = require('../../services/exports/theme-zip');
const {getExportFileName} = require('./utils/csv-export-filename');
const {rejectAdminApiRestrictedFieldsTransformer} = require('./utils/api-filter-utils');
const {createCSVTransform: createMembersCSVTransform} = require('./utils/serializers/output/members-csv-transform');
const {createCSVTransform: createPostsCSVTransform} = require('./utils/serializers/output/posts-csv-transform');
const {createZipStreamResponse} = require('./utils/serializers/output/stream-zip-response');
const {pipeline} = require('stream');

const postsService = getPostServiceInstance();

/**
 * Pipes object-mode export rows through their CSV transform, returning the
 * text stream. `pipeline` (rather than `.pipe`) so a source error destroys the
 * transform too — the zip stream then errors instead of hanging.
 *
 * @param {NodeJS.ReadableStream} rows
 * @param {import('stream').Transform} transform
 * @returns {NodeJS.ReadableStream}
 */
function toCSVStream(rows, transform) {
    pipeline(rows, transform, () => {
        // Errors surface on the transform stream itself, which the zip
        // consumer listens to — nothing to do here.
    });
    return transform;
}

/**
 * The sync site export composes the same services the individual export
 * endpoints call, wired here — in the API layer — because the CSV transforms
 * belong to the endpoint serializers, not the domain services.
 */
function createSiteExporter() {
    return new SiteExporter({
        // Same shape the `/db/` download produces, so the file stays importable
        exportContent: async () => ({db: [await exporter.doExport()]}),
        exportMembersCSV: async () => toCSVStream(await membersService.export(), createMembersCSVTransform()),
        // Same restricted-fields guard the `/posts/export/` endpoint applies
        exportPostAnalyticsCSV: async () => toCSVStream(
            await postsService.export({mongoTransformer: rejectAdminApiRestrictedFieldsTransformer}),
            createPostsCSVTransform()
        ),
        listThemes: () => Object.keys(themeList.getAll()),
        zipTheme: zipThemeToBuffer,
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
                    // `media` is deliberately not accepted: it is only
                    // available through a host archive webhook, never through
                    // this synchronous bundle
                    values: [...EXPORT_COMPONENTS]
                }
            }
        },
        // A site export contains everything a database export contains, so it
        // requires the same permission — Owner/Administrator only, a superset
        // of every composed component's own requirement
        permissions: {
            docName: 'db',
            method: 'exportContent'
        },
        query(frame) {
            const components = frame.options.components
                ? [...new Set(frame.options.components.trim().toLowerCase().split(','))]
                : [...EXPORT_COMPONENTS];

            return createZipStreamResponse({
                source: createSiteExporter().createArchive(components),
                filename: getExportFileName('export', 'zip')
            });
        }
    }
};

module.exports = controller;
