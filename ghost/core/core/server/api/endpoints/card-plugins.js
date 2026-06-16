const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const labs = require('../../../shared/labs');
const security = require('@tryghost/security');
const {compress} = require('@tryghost/zip');
const getPluginLoader = require('../../services/card-plugins/loader');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

function escapeAttr(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// --- ZIP reader (pure Node.js, for install endpoint) ---
// Reads local files only, no network operations
function readZipLocal(filePath) {
    const data = fs.readFileSync(filePath);

    // Find End of Central Directory record
    let eocdOffset = -1;
    for (let i = data.length - 22; i >= 0; i--) {
        if (data.readUInt32LE(i) === 0x06054b50) {
            eocdOffset = i;
            break;
        }
    }
    if (eocdOffset === -1) {
        throw new Error('Invalid ZIP file');
    }

    const centralDirOffset = data.readUInt32LE(eocdOffset + 16);
    const numEntries = data.readUInt16LE(eocdOffset + 10);

    const entries = [];
    let offset = centralDirOffset;

    for (let i = 0; i < numEntries; i++) {
        if (data.readUInt32LE(offset) !== 0x02014b50) {
            throw new Error('Invalid central directory');
        }
        const compressedSize = data.readUInt32LE(offset + 20);
        const uncompressedSize = data.readUInt32LE(offset + 24);
        const nameLen = data.readUInt16LE(offset + 28);
        const extraLen = data.readUInt16LE(offset + 30);
        const commentLen = data.readUInt16LE(offset + 32);
        const localHeaderOffset = data.readUInt32LE(offset + 42);
        const compressionMethod = data.readUInt16LE(offset + 10);

        const name = data.slice(offset + 46, offset + 46 + nameLen).toString('utf8');

        entries.push({
            name,
            compressedSize,
            uncompressedSize,
            localHeaderOffset,
            compressionMethod
        });

        offset += 46 + nameLen + extraLen + commentLen;
    }

    return {data, entries};
}

function extractZipEntry(zip, entry, targetDir) {
    const {data} = zip;

    // Read local file header
    const localHeader = entry.localHeaderOffset;
    if (data.readUInt32LE(localHeader) !== 0x04034b50) {
        throw new Error('Invalid local file header');
    }

    const localNameLen = data.readUInt16LE(localHeader + 26);
    const localExtraLen = data.readUInt16LE(localHeader + 28);
    const dataOffset = localHeader + 30 + localNameLen + localExtraLen;

    const entryData = data.slice(dataOffset, dataOffset + entry.compressedSize);

    let uncompressed;
    if (entry.compressionMethod === 0) {
        // Stored (no compression)
        uncompressed = entryData;
    } else if (entry.compressionMethod === 8) {
        // Deflated
        const zlib = require('zlib');
        uncompressed = zlib.inflateRawSync(entryData);
    } else {
        throw new Error(`Unsupported compression method: ${entry.compressionMethod}`);
    }

    const targetPath = path.join(targetDir, entry.name);

    // Prevent ZIP Slip: ensure the resolved path stays within targetDir
    const resolvedTarget = path.resolve(targetPath);
    const resolvedDir = path.resolve(targetDir);
    if (!resolvedTarget.startsWith(resolvedDir + path.sep) && resolvedTarget !== resolvedDir) {
        throw new Error(`Path traversal detected: ${entry.name}`);
    }

    // Create directory if needed
    if (entry.name.endsWith('/')) {
        fs.mkdirSync(targetPath, {recursive: true});
        return;
    }

    fs.mkdirSync(path.dirname(targetPath), {recursive: true});
    fs.writeFileSync(targetPath, uncompressed);
}

/**
 * Recursively walks the Lexical JSON tree and converts plugin-card nodes
 * matching `pluginName` to standard `html` nodes, preserving the rendered
 * content and metadata for potential re-conversion if the plugin is
 * reinstalled.
 *
 * @returns {boolean} true if any nodes were modified
 */
function _convertPluginCardNodes(node, pluginName, cards) {
    if (!node || typeof node !== 'object') return false;

    let modified = false;

    if (node.type === 'plugin-card' && node.pluginName === pluginName) {
        // Match the node to its specific card definition.
        // Only fall back to cards[0] for single-card plugins.
        const cardName = node.cardName || '';
        let card = cards.find(c => c.name === cardName);
        if (!card) {
            if (cards.length === 1) {
                card = cards[0];
            } else {
                return false;
            }
        }
        if (!card || !card.template) return false;

        const Handlebars = require('handlebars');
        const compiledTemplate = Handlebars.compile(card.template);

        // Render the card HTML from its payload using the plugin template.
        // Keep raw payload separate for data-ghost-payload; apply preprocess
        // to matched data for the template render (same as live renderer).
        let rawPayload = {};
        try {
            rawPayload = typeof node.payload === 'string'
                ? JSON.parse(node.payload)
                : (node.payload || {});
        } catch (e) {
            rawPayload = {};
        }

        let renderPayload = {...rawPayload};
        if (card.preprocess) {
            try {
                const {createPreprocessor} = require('@tryghost/kg-default-nodes');
                const preprocess = createPreprocessor(card.preprocess);
                if (preprocess) {
                    renderPayload = preprocess(renderPayload);
                }
            } catch (e) {
                // If preprocess fails, continue with raw payload
            }
        }

        let renderedHtml;
        try {
            renderedHtml = compiledTemplate(renderPayload);
        } catch (e) {
            renderedHtml = `<div>Plugin card (render error: ${e.message})</div>`;
        }

        // Add data attributes for re-conversion via plugin-card-parser
        const payloadStr = escapeAttr(JSON.stringify(rawPayload));
        const tagMatch = renderedHtml.match(/<(\w+)([^>]*)>/);
        if (tagMatch) {
            const tagName = tagMatch[1];
            const existingAttrs = tagMatch[2] || '';
            const dataAttrs = ` data-ghost-plugin="${escapeAttr(pluginName)}" data-card-name="${escapeAttr(node.cardName || '')}" data-ghost-payload='${payloadStr}'`;
            renderedHtml = renderedHtml.replace(
                new RegExp(`<${tagName}([^>]*)>`),
                `<${tagName}${existingAttrs}${dataAttrs}>`
            );
        }

        // Preserve CSS and markers so the content still renders styled
        const css = node.css || card.css || '';
        const styleTag = css ? `<style>${css}</style>` : '';
        const fullHtml = `\n<!--kg-card-begin: plugin-card-->\n${styleTag}${renderedHtml}\n<!--kg-card-end: plugin-card-->\n`;

        // Convert to an html node
        node.type = 'html';
        node.html = fullHtml;
        // Remove plugin-card-specific properties
        delete node.pluginName;
        delete node.cardName;
        delete node.payload;
        delete node.css;
        delete node.template;
        delete node.preprocess;

        return true;
    }

    // Walk children (Lexical nodes have a `children` array)
    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            if (_convertPluginCardNodes(child, pluginName, cards)) {
                modified = true;
            }
        }
    }

    return modified;
}

module.exports = {
    docName: 'cardPlugins',

    browse: {
        permissions: false,
        async query(frame) {
            if (!labs.isSet('customCardPlugins')) {
                throw new errors.NotFoundError();
            }

            const loader = getPluginLoader();
            const cards = loader.getAllCards();

            return cards;
        }
    },

    read: {
        permissions: false,
        options: ['name'],
        async query(frame) {
            if (!labs.isSet('customCardPlugins')) {
                throw new errors.NotFoundError();
            }

            const name = frame.data.name || frame.options.name;
            const loader = getPluginLoader();
            const plugin = loader.getPlugin(name);

            if (!plugin) {
                throw new errors.NotFoundError({message: `Plugin "${name}" not found`});
            }

            return plugin;
        }
    },

    destroy: {
        permissions: false,
        options: ['name'],
        async query(frame) {
            if (!labs.isSet('customCardPlugins')) {
                throw new errors.NotFoundError();
            }

            const name = frame.data.name || frame.options.name;
            const loader = getPluginLoader();
            const plugin = loader.getPlugin(name);

            if (!plugin) {
                throw new errors.NotFoundError({message: `Plugin "${name}" not found`});
            }

            const pluginPath = plugin.path;

            // --- Step 1: Convert plugin-card nodes to HTML in all posts ---
            if (plugin.cards && plugin.cards.length > 0) {
                try {
                    const models = require('../../models');
                    const posts = await models.Post.findPage({
                        filter: 'status:all',
                        limit: 'all',
                        columns: ['id', 'lexical', 'updated_at']
                    });
                    let convertedCount = 0;

                    for (const post of posts.data) {
                        let lexical = post.get('lexical');
                        if (!lexical) continue;

                        let lexicalData;
                        try {
                            lexicalData = typeof lexical === 'string'
                                ? JSON.parse(lexical)
                                : lexical;
                        } catch (e) {
                            continue;
                        }

                        const modified = _convertPluginCardNodes(
                            lexicalData, name, plugin.cards
                        );

                        if (modified) {
                            await models.Post.edit(
                                {lexical: JSON.stringify(lexicalData)},
                                {id: post.id, context: {internal: true}}
                            );
                            convertedCount++;
                        }
                    }

                    if (convertedCount > 0) {
                        logging.info(`Converted ${convertedCount} post(s) from plugin "${name}" cards to static HTML`);
                    }
                } catch (err) {
                    logging.error(`Failed to convert posts for plugin "${name}": ${err.message}`);
                    throw new errors.InternalServerError({message: `Cannot delete plugin "${name}": failed to convert posts. ${err.message}`});
                }
            }

            // --- Step 2: Remove the plugin directory ---
            fs.rmSync(pluginPath, {recursive: true, force: true});

            // Invalidate the loader cache
            loader.invalidate();

            logging.info(`Plugin "${name}" deleted from ${pluginPath}`);

            return {deleted: true, name};
        }
    },

    download: {
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        options: ['name'],
        query(frame) {
            if (!labs.isSet('customCardPlugins')) {
                throw new errors.NotFoundError();
            }

            const name = frame.options.name;
            const loader = getPluginLoader();
            const plugin = loader.getPlugin(name);

            if (!plugin) {
                throw new errors.NotFoundError({message: `Plugin "${name}" not found`});
            }

            // Same pattern as themes.download: compress to a temp file and stream it
            return function downloadPlugin(_req, res, next) {
                const zipName = name + '.zip';
                const zipBasePath = path.join(os.tmpdir(), security.identifier.uid(10));
                const zipPath = path.join(zipBasePath, zipName);

                fs.ensureDir(zipBasePath)
                    .then(() => compress(plugin.path, zipPath))
                    .then((result) => {
                        res.set({
                            'Content-Disposition': `attachment; filename=${name}.zip`,
                            'Content-Type': 'application/zip',
                            'Content-Length': result.size
                        });
                        const stream = fs.createReadStream(zipPath);

                        function cleanup() {
                            fs.remove(zipBasePath).catch(() => {});
                        }

                        stream.on('error', (err) => {
                            cleanup();
                            next(err);
                        });
                        res.on('close', cleanup);

                        stream.pipe(res);
                    })
                    .catch(next);
            };
        }
    },

    install: {
        permissions: false,
        async query(frame) {
            if (!labs.isSet('customCardPlugins')) {
                throw new errors.NotFoundError();
            }

            // Get the uploaded file (same pattern as theme upload)
            const file = frame.file;
            if (!file) {
                throw new errors.ValidationError({message: 'No file uploaded'});
            }

            const loader = getPluginLoader();
            const pluginsPath = loader.pluginsPath;

            // Ensure plugins directory exists
            if (!fs.existsSync(pluginsPath)) {
                fs.mkdirSync(pluginsPath, {recursive: true});
            }

            // Read the ZIP file
            let zip;
            try {
                zip = readZipLocal(file.path);
            } catch (err) {
                throw new errors.ValidationError({message: 'Invalid ZIP file: ' + err.message});
            }

            // Find plugin.json in the ZIP
            const pluginJsonEntry = zip.entries.find(e => e.name.endsWith('plugin.json'));
            if (!pluginJsonEntry) {
                throw new errors.ValidationError({message: 'Invalid plugin: no plugin.json found in ZIP'});
            }

            // Extract and parse plugin.json
            let pluginData;
            try {
                // Extract to a temp location first
                const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ghost-plugin-'));
                extractZipEntry(zip, pluginJsonEntry, tmpDir);
                const pluginJsonPath = path.join(tmpDir, pluginJsonEntry.name);
                const pluginJsonContent = fs.readFileSync(pluginJsonPath, 'utf8');
                pluginData = JSON.parse(pluginJsonContent);
                fs.rmSync(tmpDir, {recursive: true, force: true});
            } catch (err) {
                throw new errors.ValidationError({message: 'Failed to parse plugin.json: ' + err.message});
            }

            if (!pluginData.name) {
                throw new errors.ValidationError({message: 'Plugin name is required in plugin.json'});
            }

            // Reject path traversal characters in plugin name
            if (/[./\\]/.test(pluginData.name)) {
                throw new errors.ValidationError({message: 'Plugin name contains invalid characters'});
            }

            const pluginDir = path.join(pluginsPath, pluginData.name);

            // Check if plugin already exists
            if (fs.existsSync(pluginDir)) {
                throw new errors.ValidationError({message: `Plugin "${pluginData.name}" already exists. Delete it first.`});
            }

            // Extract all files to the plugin directory
            try {
                fs.mkdirSync(pluginDir, {recursive: true});
                for (const entry of zip.entries) {
                    // Strip the common root prefix from entry names.
                    // ZIPs created with `zip -r name.zip name/` have
                    // entries like "name/plugin.json", but we want to
                    // extract directly into the plugin directory.
                    const parts = entry.name.split('/');
                    const strippedName = parts.length > 1 && parts[0] === pluginData.name
                        ? parts.slice(1).join('/')
                        : entry.name;

                    if (strippedName) {
                        const destPath = path.join(pluginDir, strippedName);
                        fs.mkdirSync(path.dirname(destPath), {recursive: true});
                        const zipEntry = {...entry, name: strippedName};
                        extractZipEntry(zip, zipEntry, pluginDir);
                    }
                }
            } catch (err) {
                fs.remove(pluginDir).catch(() => {});
                throw new errors.InternalServerError({message: 'Failed to extract plugin: ' + err.message});
            }

            // Reload the plugin loader
            loader.invalidate();
            loader.load();

            const installedPlugin = loader.getPlugin(pluginData.name);
            if (!installedPlugin) {
                fs.remove(pluginDir).catch(() => {});
                throw new errors.InternalServerError({message: 'Plugin installed but failed to load'});
            }

            logging.info(`Plugin "${pluginData.name}" installed to ${pluginDir}`);

            return installedPlugin;
        }
    }
};
