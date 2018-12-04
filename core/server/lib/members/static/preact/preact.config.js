export default function (config, env, helpers) {
    if (env.production) {
        config.output.publicPath = '/members/static';
    } else {
        config.output.publicPath = 'http://localhost:8080/';
    }
    config.devServer = {
        quiet: true,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
          }
    }
}
