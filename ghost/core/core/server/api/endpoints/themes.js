const themeService = require('../../services/themes');
const limitService = require('../../services/limits');
const models = require('../../models');

// Used to emit theme.uploaded which is used in core/server/analytics-events
const events = require('../../lib/common/events');
const {settingsCache} = require('../../services/settings-helpers');

module.exports = {
    docName: 'themes',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query() {
            return themeService.api.getJSON();
        }
    },

    readActive: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        async query() {
            let themeName = settingsCache.get('active_theme');
            const themeErrors = await themeService.api.getThemeErrors(themeName);
            return themeService.api.getJSON(themeName, themeErrors);
        }
    },

    activate: {
        headers: {
            cacheInvalidate: true
        },
        options: [
            'name'
        ],
        validation: {
            options: {
                name: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            let themeName = frame.options.name;

            if (limitService.isLimited('customThemes')) {
                await limitService.errorIfWouldGoOverLimit('customThemes', {value: themeName});
            }

            const newSettings = [{
                key: 'active_theme',
                value: themeName
            }];

            const themeErrors = await themeService.api.activate(themeName);
            await models.Settings.edit(newSettings, frame.options);
            return themeService.api.getJSON(themeName, themeErrors);
        }
    },

    install: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'source',
            'ref'
        ],
        validation: {
            options: {
                source: {
                    required: true,
                    values: ['github']
                },
                ref: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'add'
        },
        async query(frame) {
            if (frame.options.source === 'github') {
                const {theme, themeOverridden} = await themeService.api.installFromGithub(frame.options.ref);

                if (themeOverridden) {
                    this.headers.cacheInvalidate = true;
                }

                events.emit('theme.uploaded', {name: theme.name});

                return theme;
            }
        }
    },

    upload: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            method: 'add'
        },
        async query(frame) {
            if (limitService.isLimited('customThemes')) {
                // Sending a bad string to make sure it fails (empty string isn't valid)
                await limitService.errorIfWouldGoOverLimit('customThemes', {value: '.'});
            }

            // @NOTE: consistent filename uploads
            frame.options.originalname = frame.file.originalname.toLowerCase();

            let zip = {
                path: frame.file.path,
                name: frame.file.originalname
            };

            return themeService.api.setFromZip(zip)
                .then(({theme, themeOverridden}) => {
                    if (themeOverridden) {
                        // CASE: clear cache
                        this.headers.cacheInvalidate = true;
                    }
                    events.emit('theme.uploaded', {name: theme.name});
                    return theme;
                });
        }
    },

    download: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'name'
        ],
        validation: {
            options: {
                name: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'read'
        },
        query(frame) {
            let themeName = frame.options.name;

            return themeService.api.getZip(themeName);
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'name'
        ],
        validation: {
            options: {
                name: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            let themeName = frame.options.name;

            return themeService.api.destroy(themeName);
        }
    }
};
