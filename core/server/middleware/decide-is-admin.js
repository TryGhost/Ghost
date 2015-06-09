// # DecideIsAdmin Middleware
// Usage: decideIsAdmin(request, result, next)
// After:
// Before:
// App: Blog
//
// Helper function to determine if its an admin page.

var decideIsAdmin;

decideIsAdmin = function decideIsAdmin(req, res, next) {
    /*jslint unparam:true*/
    res.isAdmin = req.url.lastIndexOf('/ghost/', 0) === 0;
    next();
};

module.exports = decideIsAdmin;
