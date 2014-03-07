// ### Config for grunt-mocha-cli
// Run mocha unit tests

module.exports = {

    options: {
        ui: 'bdd',
        reporter: 'spec',
        timeout: '15000'
    },

    unit: {
        src: ['core/test/unit/**/*_spec.js']
    },

    model: {
        src: ['core/test/integration/**/model*_spec.js']
    },

    client: {
        src: ['core/test/unit/**/client*_spec.js']
    },

    server: {
        src: ['core/test/unit/**/server*_spec.js']
    },

    shared: {
        src: ['core/test/unit/**/shared*_spec.js']
    },

    perm: {
        src: ['core/test/unit/**/permissions_spec.js']
    },

    migrate: {
        src: [
            'core/test/unit/**/export_spec.js',
            'core/test/unit/**/import_spec.js'
        ]
    },

    storage: {
        src: ['core/test/unit/**/storage*_spec.js']
    },

    integration: {
        src: [
            'core/test/integration/**/model*_spec.js',
            'core/test/integration/**/api*_spec.js'
        ]
    },

    api: {
        src: ['core/test/functional/api/*_test.js']
    },

    routes: {
        src: ['core/test/functional/routes/*_test.js']
    }

};