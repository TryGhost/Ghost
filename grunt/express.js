// ### Config for grunt-express-server
// Start our server in development

module.exports = {

    options: {
        script: 'index.js',
        output: 'Ghost is running'
    },

    dev: {
        options: {
            //output: 'Express server listening on address:.*$'
        }
    },
    test: {
        options: {
            node_env: 'testing'
        }
    }

};