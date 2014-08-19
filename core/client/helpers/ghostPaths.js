// Handlebars Helper {{gh-path}}
// Usage: Assume 'http://www.myghostblog.org/myblog/'
// {{gh-path}} or {{gh-path ‘blog’}} for Ghost’s root (/myblog/)
// {{gh-path ‘admin’}} for Ghost’s admin root (/myblog/ghost/)
// {{gh-path ‘api’}} for Ghost’s api root (/myblog/ghost/api/v0.1/)
// {{gh-path 'admin' '/assets/hi.png'}} for resolved url (/myblog/ghost/assets/hi.png)
import ghostPaths from 'ghost/utils/ghost-paths';

export default function (path, url) {

    var base;

    switch (path.toString()) {
        case 'blog':
            base = ghostPaths().blogRoot;
            break;
        case 'admin':
            base = ghostPaths().adminRoot;
            break;
        case 'api':
            base = ghostPaths().apiRoot;
            break;
        default:
            base = ghostPaths().blogRoot;
            break;
    }

    if (url && url.length > 0) {
        base = base + url;
    }

    return new Ember.Handlebars.SafeString(base);

}