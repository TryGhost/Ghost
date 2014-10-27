// Handlebars Helper {{gh-path}}
// Usage: Assume 'http://www.myghostblog.org/myblog/'
// {{gh-path}} or {{gh-path ‘blog’}} for Ghost’s root (/myblog/)
// {{gh-path ‘admin’}} for Ghost’s admin root (/myblog/ghost/)
// {{gh-path ‘api’}} for Ghost’s api root (/myblog/ghost/api/v0.1/)
// {{gh-path 'admin' '/assets/hi.png'}} for resolved url (/myblog/ghost/assets/hi.png)
import ghostPaths from 'ghost/utils/ghost-paths';

function ghostPathsHelper(path, url) {
    var base,
        argsLength = arguments.length,
        paths = ghostPaths();

    // function is always invoked with at least one parameter, so if
    // arguments.length is 1 there were 0 arguments passed in explicitly
    if (argsLength === 1) {
        path = 'blog';
    } else if (argsLength === 2 && !/^(blog|admin|api)$/.test(path)) {
        url = path;
        path = 'blog';
    }

    switch (path.toString()) {
        case 'blog':
            base = paths.blogRoot;
            break;
        case 'admin':
            base = paths.adminRoot;
            break;
        case 'api':
            base = paths.apiRoot;
            break;
        default:
            base = paths.blogRoot;
            break;
    }

    // handle leading and trailing slashes

    base = base[base.length - 1] !== '/' ? base + '/' : base;

    if (url && url.length > 0) {
        if (url[0] === '/') {
            url = url.substr(1);
        }

        base = base + url;
    }

    return new Ember.Handlebars.SafeString(base);
}

export default ghostPathsHelper;
