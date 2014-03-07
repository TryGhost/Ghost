// ### Config for grunt-contrib-clean
// Clean up files as part of other tasks

module.exports = {

	release: {
		src: ['<%= paths.releaseBuild %>/**']
	},
	test: {
		src: ['content/data/ghost-test.db']
	}

};