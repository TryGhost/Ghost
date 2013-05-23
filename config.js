// # Ghost Configuration

module.exports = {

    defaultLang: 'en',

    forceI18n: true,

    // ## Themes

    themeDir: 'themes',

    activeTheme: 'casper',

    // ## Homepage settings

    homepage: {

        features: 1,

        posts: 4

    },

    database: {
        development: {
            client: 'sqlite3',
            connection: {
                filename: './core/shared/data/testdb.db'
            },
            debug: true
        },

        staging: {},

        production: {}
    }

};
