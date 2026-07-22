import ghostPaths from 'ghost-admin/utils/ghost-paths';

export default function () {
    // allow any local requests outside of the namespace (configured below) to hit the real server
    // _must_ be called before the namespace property is set
    this.passthrough('/ghost/assets/**');

    this.namespace = ghostPaths().apiRoot;
    this.timing = 1000; // delay for each request, automatically set to 0 during testing
    this.logging = true;

    // Mock endpoints here to override real API requests during development, eg...
    // this.put('/posts/:id/', versionMismatchResponse);
    // mockTags(this);
    // this.loadFixtures('settings');

    // keep this line, it allows all other API requests to hit the real server
    this.passthrough();

    // add any external domains to make sure those get passed through too
    this.passthrough('http://www.gravatar.com/**');
    this.passthrough('https://cdn.jsdelivr.net/**');
    this.passthrough('https://api.unsplash.com/**');
    this.passthrough('https://ghost.org/**');
}
