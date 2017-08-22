import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {helper} from '@ember/component/helper';
import {htmlSafe} from '@ember/string';

// Handlebars Helper {{gh-path}}
// Usage: Assume 'http://www.myghostblog.org/myblog/'
// {{gh-path}} or {{gh-path 'blog'}} for Ghost's root (/myblog/)
// {{gh-path 'admin'}} for Ghost's admin root (/myblog/ghost/)
// {{gh-path 'api'}} for Ghost's api root (/myblog/ghost/api/v0.1/)
//
// DO NOT USE - admin asset paths are now relative because we are using hash urls
//              and the gh-path helper can get in the way of asset rewriting
// {{gh-path 'asset' '/img/hi.png'}} for resolved url (/myblog/ghost/assets/img/hi.png)

export default helper(function (params) {
    let paths = ghostPaths();
    let [path, url] = params;
    let base;

    if (!path) {
        path = 'blog';
    }

    if (!/^(blog|admin|asset|api)$/.test(path)) {
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
    case 'asset':
        base = paths.assetRoot;
        break;
    case 'api':
        base = paths.apiRoot;
        break;
    default:
        base = paths.blogRoot;
        break;
    }

    // handle leading and trailing slashes

    base = base[base.length - 1] !== '/' ? `${base}/` : base;

    if (url && url.length > 0) {
        if (url[0] === '/') {
            url = url.substr(1);
        }

        base = base + url;
    }

    return htmlSafe(base);
});
