const config = require('./core/shared/config');

module.exports = function (grunt) {
    // --- Configuration
    grunt.initConfig({
        shell: {
            ember: {
                command: function (mode) {
                    const liveReloadBaseUrl = config.getSubdir() || '/ghost/';

                    switch (mode) {
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
    });

    // Load all grunt tasks
    grunt.loadNpmTasks('grunt-contrib-symlink');
    grunt.loadNpmTasks('grunt-shell');
};
