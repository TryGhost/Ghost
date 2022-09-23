module.exports = function (grunt) {
    // --- Configuration
    grunt.initConfig({
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
};
