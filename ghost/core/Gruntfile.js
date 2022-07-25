const config = require('./core/shared/config');

module.exports = function (grunt) {
    // grunt dev - use yarn dev instead!
    // - Start a server & build assets on the fly whilst developing
    grunt.registerTask('dev:admin', 'Dev Mode; run Admin with livereload', 'shell:ember:watch');

    // grunt build -- use yarn build instead!
    // - Builds the admin without a watch task
    grunt.registerTask('build', 'Build admin app in development mode', 'ember');

    // Runs the asset generation tasks for production and duplicates default-prod.html to default.html
    grunt.registerTask('release', 'Release task - creates a final built zip', 'prod');

    // --- Sub Commands
    // Used to make other commands work

    // Updates submodules, then installs and builds the admin for you
    grunt.registerTask('init', 'Prepare the project for development', 'build');

    // Runs ember dev
    grunt.registerTask('ember', 'Build JS & templates for development',
        ['shell:ember:dev']);

    // Production asset build
    grunt.registerTask('prod', 'Build JS & templates for production', 'shell:ember:prod');

    // --- Configuration
    const cfg = {
        shell: {
            ember: {
                command: function (mode) {
                    const liveReloadBaseUrl = config.getSubdir() || '/ghost/';

                    switch (mode) {
                    case 'dev':
                        return 'yarn build';
                    case 'prod':
                        return 'yarn build:prod';
                    case 'watch':
                        return `yarn start --live-reload-base-url=${liveReloadBaseUrl} --live-reload-port=4201`;
                    }
                },
                options: {
                    execOptions: {
                        cwd: '../admin'
                    }
                }
            },

            options: {
                preferLocal: true
            }
        },

        // grunt-contrib-symlink
        // Create symlink for git hooks
        symlink: {
            githooks: {
                // Enable overwrite to delete symlinks before recreating them
                overwrite: false,
                // Enable force to overwrite symlinks outside the current working directory
                force: false,
                // Expand to all files in /hooks
                expand: true,
                cwd: '.github/hooks',
                src: ['*'],
                dest: '.git/hooks'
            }
        }
    };

    // --- Grunt Initialisation

    // Load all grunt tasks
    grunt.loadNpmTasks('grunt-contrib-symlink');
    grunt.loadNpmTasks('grunt-shell');

    // Load the configuration
    grunt.initConfig(cfg);
};
