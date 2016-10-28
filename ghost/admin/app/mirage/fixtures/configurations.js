export default [{
    blogTitle: 'Test Blog',
    blogUrl: 'http://localhost:7357/',
    clientId: 'ghost-admin',
    clientSecret: '1234ClientSecret',
    fileStorage: 'true',
    // these are valid attrs but we want password auth by default in tests
    // ghostAuthId: '1234GhostAuthId',
    // ghostAuthUrl: 'http://devauth.ghost.org:8080',
    internalTags: 'false',
    publicAPI: 'false',
    routeKeywords: {
        tag: 'tag',
        author: 'author',
        page: 'page',
        preview: 'p',
        private: 'private'
    },
    useGravatar: 'true'
}];
