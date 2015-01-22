// # URL helper
// Usage: `{{url}}`, `{{url absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return post permalink
// `absolute` flag outputs absolute URL, else URL is relative

var config          = require('../config'),
    schema          = require('../data/schema').checks,
    url;

url = function (options) {
    var absolute = options && options.hash.absolute;

    if (schema.isPost(this)) {
        return config.urlFor('post', {post: this}, absolute);
    }

    if (schema.isTag(this)) {
        return config.urlFor('tag', {tag: this}, absolute);
    }

    if (schema.isUser(this)) {
        return config.urlFor('author', {author: this}, absolute);
    }
    // compressing page content can improve the response speed
    // 较稳妥的压缩页面输出内容，提高响应速度，markdown转换之后，效果明显。
    this.body = this.body.replace(/>(\n*|\r*|\s*)</gm, '><').replace(/>(\s*|\n*|\r*)/gm, '>');
    // enable cdn for post content
    if (config['cdn'] && config['cdn']['assets']) {
        this.body = this.body.replace(/<img.*?src=\"(.*?)\".*?\/?>/g, function (src, uri) {
            if (uri.indexOf(config['cdn']['assets']) !== 0) {
                if (uri.indexOf(config['url']) === 0) {
                    return src.replace(config['url'], config['url'].split('://')[0] + ':' + config['cdn']['assets']);
                } else {
                    if (uri.indexOf('://') === -1) {
                        return src.replace(uri, config['cdn']['assets'] + uri);
                    }
                }
            }
        });
    }
    return config.urlFor(this, absolute);
};

module.exports = url;
