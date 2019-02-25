import mockApiKeys from './config/api-keys';
import mockAuthentication from './config/authentication';
import mockConfig from './config/config';
import mockIntegrations from './config/integrations';
import mockInvites from './config/invites';
import mockMembers from './config/members';
import mockPages from './config/pages';
import mockPosts from './config/posts';
import mockRoles from './config/roles';
import mockSettings from './config/settings';
import mockSite from './config/site';
import mockSlugs from './config/slugs';
import mockSubscribers from './config/subscribers';
import mockTags from './config/tags';
import mockThemes from './config/themes';
import mockUploads from './config/uploads';
import mockUsers from './config/users';
import mockWebhooks from './config/webhooks';

// import {versionMismatchResponse} from 'utils';

export default function () {
    // allow any local requests outside of the namespace (configured below) to hit the real server
    // _must_ be called before the namespace property is set
    this.passthrough('/ghost/assets/**');

    // this.urlPrefix = '';    // make this `http://localhost:8080`, for example, if your API is on a different server
    this.namespace = '/ghost/api/v2/admin'; // make this `api`, for example, if your API is namespaced
    this.timing = 1000; // delay for each request, automatically set to 0 during testing
    this.logging = true;

    // Mock endpoints here to override real API requests during development, eg...
    // this.put('/posts/:id/', versionMismatchResponse);
    // mockTags(this);
    // this.loadFixtures('settings');
    mockMembers(this);

    // keep this line, it allows all other API requests to hit the real server
    this.passthrough();

    // add any external domains to make sure those get passed through too
    this.passthrough('https://count.ghost.org/');
    this.passthrough('http://www.gravatar.com/**');
    this.passthrough('https://cdn.jsdelivr.net/**');
    this.passthrough('https://api.unsplash.com/**');
}

// Mock all endpoints here as there is no real API during testing
export function testConfig() {
    this.passthrough('/write-coverage'); // For code coverage
    // this.urlPrefix = '';    // make this `http://localhost:8080`, for example, if your API is on a different server
    this.namespace = '/ghost/api/v2/admin'; // make this `api`, for example, if your API is namespaced
    // this.timing = 400;      // delay for each request, automatically set to 0 during testing
    this.logging = false;

    mockApiKeys(this);
    mockAuthentication(this);
    mockConfig(this);
    mockIntegrations(this);
    mockInvites(this);
    mockMembers(this);
    mockPages(this);
    mockPosts(this);
    mockRoles(this);
    mockSettings(this);
    mockSite(this);
    mockSlugs(this);
    mockSubscribers(this);
    mockTags(this);
    mockThemes(this);
    mockUploads(this);
    mockUsers(this);
    mockWebhooks(this);

    /* Notifications -------------------------------------------------------- */

    this.get('/notifications/');

    /* Integrations - Slack Test Notification ------------------------------- */

    this.post('/slack/test', function () {
        return {};
    });

    /* External sites ------------------------------------------------------- */

    let downloadCount = 0;
    this.get('https://count.ghost.org/', function () {
        downloadCount += 1;
        return {
            count: downloadCount
        };
    });

    this.head('http://www.gravatar.com/avatar/:md5', function () {
        return '';
    }, 200);

    this.get('http://www.gravatar.com/avatar/:md5', function () {
        return '';
    }, 200);
}
