// ### Config for grunt-contrib-compress
// Zip up builds / releases

module.exports = {

	release: {
		options: {
			archive: '<%= paths.releaseDist %>/Ghost-<%= pkg.version %>.zip'
		},
		expand: true,
		cwd: '<%= paths.releaseBuild %>/',
		src: ['**']
	}

};