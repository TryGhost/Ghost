import Ember from 'ember';
import ghostPaths from 'ghost/utils/ghost-paths';

// Handlebars Helper {{gh-path}}
// Usage: Assume 'http://www.myghostblog.org/myblog/'
// {{gh-path}} or {{gh-path 'blog'}} for Ghost's root (/myblog/)
// {{gh-path 'admin'}} for Ghost's admin root (/myblog/ghost/)
// {{gh-path 'api'}} for Ghost's api root (/myblog/ghost/api/v0.1/)
// {{gh-path 'admin' '/assets/hi.png'}} for resolved url (/myblog/ghost/assets/hi.png)

function ghostPathsHelper(params/*, hash */) {
    var base,
        paths = ghostPaths(),
        [path, url] = params;

    if (!path) {
        path = 'blog';
    }

    if (!/^(blog|admin|api)$/.test(path)) {
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

    return Ember.String.htmlSafe(base);
}

export default Ember.HTMLBars.makeBoundHelper(ghostPathsHelper);
