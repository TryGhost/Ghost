// ### Config for grunt-contrib-concat
// concatenate multiple JS files into a single file ready for use

module.exports = {

	dev: {
		files: {
			'core/built/scripts/vendor.js': [
				'core/shared/vendor/jquery/jquery.js',
				'core/shared/vendor/jquery/jquery-ui-1.10.3.custom.min.js',
				'core/client/assets/lib/jquery-utils.js',
				'core/client/assets/lib/uploader.js',
				'core/shared/vendor/lodash.underscore.js',
				'core/shared/vendor/backbone/backbone.js',
				'core/shared/vendor/handlebars/handlebars-runtime.js',
				'core/shared/vendor/moment.js',

				'core/shared/vendor/jquery/jquery.ui.widget.js',
				'core/shared/vendor/jquery/jquery.iframe-transport.js',
				'core/shared/vendor/jquery/jquery.fileupload.js',

				'core/client/assets/vendor/codemirror/codemirror.js',
				'core/client/assets/vendor/codemirror/addon/mode/overlay.js',
				'core/client/assets/vendor/codemirror/mode/markdown/markdown.js',
				'core/client/assets/vendor/codemirror/mode/gfm/gfm.js',
				'core/client/assets/vendor/showdown/showdown.js',
				'core/client/assets/vendor/showdown/extensions/ghostdown.js',
				'core/shared/vendor/showdown/extensions/typography.js',
				'core/shared/vendor/showdown/extensions/github.js',
				'core/client/assets/vendor/shortcuts.js',
				'core/client/assets/vendor/validator-client.js',
				'core/client/assets/vendor/countable.js',
				'core/client/assets/vendor/to-title-case.js',
				'core/client/assets/vendor/packery.pkgd.min.js',
				'core/client/assets/vendor/fastclick.js',
				'core/client/assets/vendor/nprogress.js'
			],

			'core/built/scripts/helpers.js': [
				'core/client/init.js',

				'core/client/mobile-interactions.js',
				'core/client/toggle.js',
				'core/client/markdown-actions.js',
				'core/client/helpers/index.js'
			],

			'core/built/scripts/templates.js': [
				'core/client/tpl/hbs-tpl.js'
			],

			'core/built/scripts/models.js': [
				'core/client/models/**/*.js'
			],

			'core/built/scripts/views.js': [
				'core/client/views/**/*.js',
				'core/client/router.js'
			]
		}
	},

	prod: {
		files: {
			'core/built/scripts/ghost.js': [
				'core/shared/vendor/jquery/jquery.js',
				'core/shared/vendor/jquery/jquery-ui-1.10.3.custom.min.js',
				'core/client/assets/lib/jquery-utils.js',
				'core/client/assets/lib/uploader.js',
				'core/shared/vendor/lodash.underscore.js',
				'core/shared/vendor/backbone/backbone.js',
				'core/shared/vendor/handlebars/handlebars-runtime.js',
				'core/shared/vendor/moment.js',

				'core/shared/vendor/jquery/jquery.ui.widget.js',
				'core/shared/vendor/jquery/jquery.iframe-transport.js',
				'core/shared/vendor/jquery/jquery.fileupload.js',

				'core/client/assets/vendor/codemirror/codemirror.js',
				'core/client/assets/vendor/codemirror/addon/mode/overlay.js',
				'core/client/assets/vendor/codemirror/mode/markdown/markdown.js',
				'core/client/assets/vendor/codemirror/mode/gfm/gfm.js',
				'core/client/assets/vendor/showdown/showdown.js',
				'core/client/assets/vendor/showdown/extensions/ghostdown.js',
				'core/shared/vendor/showdown/extensions/typography.js',
				'core/shared/vendor/showdown/extensions/github.js',
				'core/client/assets/vendor/shortcuts.js',
				'core/client/assets/vendor/validator-client.js',
				'core/client/assets/vendor/countable.js',
				'core/client/assets/vendor/to-title-case.js',
				'core/client/assets/vendor/packery.pkgd.min.js',
				'core/client/assets/vendor/fastclick.js',
				'core/client/assets/vendor/nprogress.js',

				'core/client/init.js',

				'core/client/mobile-interactions.js',
				'core/client/toggle.js',
				'core/client/markdown-actions.js',
				'core/client/helpers/index.js',

				'core/client/tpl/hbs-tpl.js',

				'core/client/models/**/*.js',

				'core/client/views/**/*.js',

				'core/client/router.js'
			]
		}
	}

};