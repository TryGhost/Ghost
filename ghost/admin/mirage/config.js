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
    this.namespace = '/ghost/api/canary/admin'; // make this `api`, for example, if your API is namespaced
    this.timing = 1000; // delay for each request, automatically set to 0 during testing
    this.logging = true;

    // Mock endpoints here to override real API requests during development, eg...
    // this.put('/posts/:id/', versionMismatchResponse);
    // mockTags(this);
    // this.loadFixtures('settings');
    // mockMembers(this);

    // keep this line, it allows all other API requests to hit the real server
    this.passthrough();

    // add any external domains to make sure those get passed through too
    this.passthrough('https://count.ghost.org/');
    this.passthrough('http://www.gravatar.com/**');
    this.passthrough('https://cdn.jsdelivr.net/**');
    this.passthrough('https://api.unsplash.com/**');
    this.passthrough('https://ghost.org/**');
}

// Mock all endpoints here as there is no real API during testing
export function testConfig() {
    // this.urlPrefix = '';    // make this `http://localhost:8080`, for example, if your API is on a different server
    this.namespace = '/ghost/api/canary/admin'; // make this `api`, for example, if your API is namespaced
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

    this.get('https://ghost.org/changelog.json', function () {
        return {
            changelog: [
                {
                    title: 'Custom image alt tags',
                    custom_excerpt: null,
                    html: '<p>We just shipped custom image alt tag support in the Ghost editor. This is one of our most requested features - and great news for accessibility and search engine optimisation for your Ghost publication.</p><p>Previously, you\'d need to use a Markdown card to add an image alt tag. Now you can create alt tags on the go directly from the editor, without the need to add any additional cards or custom tags.</p><!--kg-card-begin: image--><figure class="kg-card kg-image-card"><img src="https://mainframe.ghost.io/content/images/2019/08/image-alt-tag.gif" class="kg-image"></figure><!--kg-card-end: image--><p>To write your alt tag, hit the <code>alt</code> button on the right in the caption line, type your alt text and then hit the button again to return to the caption text. </p><p><em><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><a href="https://ghost.org/pricing/">Ghost(Pro)</a></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong> users already have access to custom image alt tags. Self hosted developers can use <a href="https://ghost.org/docs/api/ghost-cli/">Ghost-CLI</a> to install the latest release!</em></p>',
                    slug: 'image-alt-text-support',
                    published_at: '2019-08-05T07:46:16.000+00:00',
                    url: 'https://ghost.org/blog/image-alt-text-support/'
                }
            ],
            changelogMajor: [],
            changelogUrl: 'https://ghost.org/blog/'
        };
    });
}
