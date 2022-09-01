import ghostPaths from 'ghost-admin/utils/ghost-paths';

import mockApiKeys from './config/api-keys';
import mockAuthentication from './config/authentication';
import mockConfig from './config/config';
import mockCustomThemeSettings from './config/custom-theme-settings';
import mockEmails from './config/emails';
import mockIntegrations from './config/integrations';
import mockInvites from './config/invites';
import mockLabels from './config/labels';
import mockMembers from './config/members';
import mockNewsletters from './config/newsletters';
import mockOffers from './config/offers';
import mockPages from './config/pages';
import mockPosts from './config/posts';
import mockRoles from './config/roles';
import mockSettings from './config/settings';
import mockSite from './config/site';
import mockSlugs from './config/slugs';
import mockSnippets from './config/snippets';
import mockStats from './config/stats';
import mockTags from './config/tags';
import mockThemes from './config/themes';
import mockTiers from './config/tiers';
import mockUploads from './config/uploads';
import mockUsers from './config/users';
import mockWebhooks from './config/webhooks';

/* eslint-disable ghost/ember/no-test-import-export */
export default function () {
    this.namespace = ghostPaths().apiRoot;
    // this.timing = 400;      // delay for each request, automatically set to 0 during testing
    this.logging = false;

    mockApiKeys(this);
    mockAuthentication(this);
    mockConfig(this);
    mockCustomThemeSettings(this);
    mockEmails(this);
    mockIntegrations(this);
    mockInvites(this);
    mockMembers(this);
    mockLabels(this);
    mockPages(this);
    mockPosts(this);
    mockRoles(this);
    mockSettings(this);
    mockSite(this);
    mockSlugs(this);
    mockTags(this);
    mockThemes(this);
    mockUploads(this);
    mockUsers(this);
    mockWebhooks(this);
    mockTiers(this);
    mockOffers(this);
    mockSnippets(this);
    mockNewsletters(this);
    mockStats(this);

    /* Notifications -------------------------------------------------------- */

    this.get('/notifications/');

    /* Integrations - Slack Test Notification ------------------------------- */

    this.post('/slack/test', function () {
        return {};
    });

    /* External sites ------------------------------------------------------- */

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
                    html: '<p>We just shipped custom image alt tag support in the Ghost editor. This is one of our most requested features - and great news for accessibility and search engine optimisation for your Ghost publication.</p><p>Previously, you\'d need to use a Markdown card to add an image alt tag. Now you can create alt tags on the go directly from the editor, without the need to add any additional cards or custom tags.</p><!--kg-card-begin: image--><figure class="kg-card kg-image-card"><img src="https://ghost.org/changelog/content/images/2019/08/image-alt-tag.gif" class="kg-image"></figure><!--kg-card-end: image--><p>To write your alt tag, hit the <code>alt</code> button on the right in the caption line, type your alt text and then hit the button again to return to the caption text. </p><p><em><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><strong><a href="https://ghost.org/pricing/">Ghost(Pro)</a></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong></strong> users already have access to custom image alt tags. Self hosted developers can use <a href="https://ghost.org/docs/ghost-cli/">Ghost-CLI</a> to install the latest release!</em></p>',
                    slug: 'image-alt-text-support',
                    published_at: '2019-08-05T07:46:16.000+00:00',
                    url: 'https://ghost.org/changelog/image-alt-text-support/'
                }
            ],
            changelogMajor: [],
            changelogUrl: 'https://ghost.org/changelog/'
        };
    });
}
