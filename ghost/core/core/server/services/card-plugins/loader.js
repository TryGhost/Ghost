const fs = require('fs');
const path = require('path');
const logging = require('@tryghost/logging');

const PLUGIN_FIELDS = ['name', 'version', 'cards'];

class PluginLoader {
    constructor(options = {}) {
        this.pluginsPath = options.pluginsPath || this._getDefaultPluginsPath();
        this.plugins = new Map();
        this.loaded = false;
    }

    _getDefaultPluginsPath() {
        const config = require('../../../shared/config');
        return path.join(config.get('paths').contentPath, 'plugins');
    }

    load() {
        if (this.loaded) {
            return this.plugins;
        }

        this.plugins.clear();

        if (!fs.existsSync(this.pluginsPath)) {
            logging.info('No plugins directory found, skipping plugin loading');
            this.loaded = true;
            return this.plugins;
        }

        const entries = fs.readdirSync(this.pluginsPath, {withFileTypes: true});

        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }

            const pluginDir = path.join(this.pluginsPath, entry.name);
            const pluginJsonPath = path.join(pluginDir, 'plugin.json');

            if (!fs.existsSync(pluginJsonPath)) {
                logging.warn(`Plugin directory "${entry.name}" has no plugin.json, skipping`);
                continue;
            }

            try {
                const pluginData = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
                const validationError = this._validatePlugin(pluginData, entry.name);
                if (validationError) {
                    logging.error(`Plugin "${entry.name}" validation failed: ${validationError}`);
                    continue;
                }

                const plugin = this._loadPlugin(pluginData, pluginDir);
                this.plugins.set(plugin.name, plugin);
                logging.info(`Loaded plugin: ${plugin.name} v${plugin.version}`);
            } catch (err) {
                logging.error(`Failed to load plugin "${entry.name}": ${err.message}`);
            }
        }

        this.loaded = true;
        return this.plugins;
    }

    _validatePlugin(data, dirName) {
        for (const field of PLUGIN_FIELDS) {
            if (!data[field]) {
                return `Missing required field: ${field}`;
            }
        }

        if (data.name !== dirName) {
            return `Plugin name "${data.name}" does not match directory name "${dirName}"`;
        }

        if (!Array.isArray(data.cards) || data.cards.length === 0) {
            return 'Plugin must define at least one card';
        }

        for (const card of data.cards) {
            if (!card.name || !card.label || !Array.isArray(card.fields)) {
                return `Card "${card.name || 'unknown'}" is missing required fields (name, label, fields)`;
            }
        }

        return null;
    }

    _loadPlugin(data, pluginDir) {
        const cards = data.cards.map(card => {
            const templatePath = path.join(pluginDir, 'template.html');
            let template = '';
            if (fs.existsSync(templatePath)) {
                template = fs.readFileSync(templatePath, 'utf8');
            }

            const cssPath = path.join(pluginDir, 'card.css');
            let css = '';
            if (fs.existsSync(cssPath)) {
                css = fs.readFileSync(cssPath, 'utf8');
            }

            // Load optional preprocess.js for data transformations
            const preprocessFile = card.preprocess || 'preprocess.js';
            const preprocessPath = path.join(pluginDir, preprocessFile);

            // Prevent path traversal: ensure the file is inside pluginDir
            const resolvedPath = path.resolve(preprocessPath);
            const resolvedDir = path.resolve(pluginDir);
            if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
                throw new Error(`Path traversal detected in preprocess: ${preprocessFile}`);
            }

            let preprocess = '';
            if (fs.existsSync(resolvedPath)) {
                preprocess = fs.readFileSync(resolvedPath, 'utf8');
            }

            return {
                ...card,
                template,
                css,
                preprocess
            };
        });

        return {
            name: data.name,
            version: data.version,
            label: data.label || data.name,
            description: data.description || '',
            icon: data.icon || '',
            cards,
            path: pluginDir
        };
    }

    getPlugin(name) {
        if (!this.loaded) {
            this.load();
        }
        return this.plugins.get(name);
    }

    getCard(pluginName, cardName) {
        const plugin = this.getPlugin(pluginName);
        if (!plugin) {
            return null;
        }
        return plugin.cards.find(c => c.name === cardName) || null;
    }

    getAllCards() {
        if (!this.loaded) {
            this.load();
        }

        const allCards = [];
        for (const plugin of this.plugins.values()) {
            for (const card of plugin.cards) {
                allCards.push({
                    plugin: plugin.name,
                    pluginVersion: plugin.version,
                    name: card.name,
                    label: card.label,
                    icon: plugin.icon,
                    fields: card.fields,
                    template: card.template,
                    css: card.css || '',
                    preprocess: card.preprocess || ''
                });
            }
        }
        return allCards;
    }

    invalidate() {
        this.loaded = false;
        this.plugins.clear();
    }
}

let instance;

module.exports = function getPluginLoader(options) {
    if (!instance) {
        instance = new PluginLoader(options);
    }
    return instance;
};

module.exports.PluginLoader = PluginLoader;
