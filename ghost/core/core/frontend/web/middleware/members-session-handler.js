const membersService = require('../../../server/services/members');

function conditionalMemberSessionMiddleware(req, res, next) {
    const bypassMembersSession = [
        '/sitemap.xml', 
        '/sitemap-pages.xml', 
        '/sitemap-posts.xml',
        '/sitemap-tags.xml',
        '/sitemap-authors.xml',
        '/.well-known/recommendations.json',
        '/assets/fonts/inter-roman.woff2',
        '/assets/built/source.js',
        '/assets/built/screen.css'
    ].some(
        rtx => req.path.startsWith(rtx)
    );

    if (bypassMembersSession) {
        return next();
    } else {
        return membersService.middleware.loadMemberSession(req, res, next);
    }
}

module.exports = conditionalMemberSessionMiddleware;