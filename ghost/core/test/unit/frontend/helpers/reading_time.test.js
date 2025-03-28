const should = require('should');

// Stuff we are testing
const reading_time = require('../../../../core/frontend/helpers/reading_time');

const almostOneMinute =
    '<p>Ghost has a number of different user roles for your team</p>' +
    '<h3 id="authors">Authors</h3><p>The base user level in Ghost is an author. Authors can write posts,' +
    ' edit their own posts, and publish their own posts. Authors are <strong>trusted</strong> users. If you ' +
    'don\'t trust users to be allowed to publish their own posts, you shouldn\'t invite them to Ghost admin.</p>' +
    '<h3 id="editors">Editors</h3><p>Editors are the 2nd user level in Ghost. Editors can do everything that an' +
    ' Author can do, but they can also edit and publish the posts of others - as well as their own. Editors can also invite new' +
    ' authors to the site.</p><h3 id="administrators">Administrators</h3><p>The top user level in Ghost is Administrator.' +
    ' Again, administrators can do everything that Authors and Editors can do, but they can also edit all site settings ' +
    'and data, not just content. Additionally, administrators have full access to invite, manage or remove any other' +
    ' user of the site.</p><h3 id="theowner">The Owner</h3><p>There is only ever one owner of a Ghost site. ' +
    'The owner is a special user which has all the same permissions as an Administrator, but with two exceptions: ' +
    'The Owner can never be deleted. And in some circumstances the owner will have access to additional special settings ' +
    'if applicable — for example, billing details, if using Ghost(Pro).</p><hr><p>It\'s a good idea to ask all of your' +
    ' users to fill out their user profiles, including bio and social links. These will populate rich structured data ' +
    'for posts and generally create more opportunities for themes to fully populate their design.</p>';

const almostOneAndAHalfMinute = almostOneMinute +
    '<div>' +
    '<p>Ghost has a number of different user roles for your team</p>' +
    '<h3 id="authors">Authors</h3><p>The base user level in Ghost is an author. Authors can write posts,' +
    ' edit their own posts, and publish their own posts. Authors are <strong>trusted</strong> users. If you ' +
    'don\'t trust users to be allowed to publish their own posts, you shouldn\'t invite them to Ghost admin.</p>' +
    '<h3 id="editors">Editors</h3><p>Editors are the 2nd user level in Ghost. Editors can do everything that an' +
    ' Author can do, but they can also edit and publish the posts of others - as well as their own. Editors can also invite new' +
    ' authors to the site.</p><h3 id="administrators">Administrators</h3><p>The top user level in Ghost is Administrator.' +
    ' Again, administrators can do everything that Authors and Editors can do, but they can also edit all site settings ' +
    'and data, not just content. Additionally, administrators have full access to invite</p>' +
    '</div>';

describe('{{reading_time}} helper', function () {
    it('[success] renders reading time for less than one minute text as one minute', function () {
        const data = {
            html: almostOneMinute,
            title: 'Test',
            slug: 'slug'
        };

        const result = reading_time.call(data);

        String(result).should.equal('1 min read');
    });

    it('[success] renders reading time for one minute text as one minute', function () {
        const data = {
            html: almostOneMinute +
                      'This needed about twenty-five more words before passing the one minute reading time, ' +
                      'since the word count was 250, and the average speed is 275.',
            title: 'Test',
            slug: 'slug'
        };

        const result = reading_time.call(data);

        String(result).should.equal('1 min read');
    });

    it('[success] renders reading time for just under 1.5 minutes text as one minute', function () {
        const data = {
            html: almostOneAndAHalfMinute,
            title: 'Test',
            slug: 'slug'
        };

        const result = reading_time.call(data);

        String(result).should.equal('1 min read');
    });

    it('[success] adds time for feature image', function () {
        const data = {
            html: almostOneAndAHalfMinute,
            title: 'Test',
            slug: 'slug',
            feature_image: '/content/images/someimage.jpg'
        };

        const result = reading_time.call(data);

        // The reading time for this HTML snippet would 89 seconds without the image
        // Adding the 12 additional seconds for the image results in a readng time of over 1.5 minutes, rounded to 2
        String(result).should.equal('2 min read');
    });

    it('[success] adds time for inline images', function () {
        const data = {
            html: almostOneAndAHalfMinute +
                  '<img src="test.png">',
            title: 'Test',
            slug: 'slug'
        };

        const result = reading_time.call(data);

        // The reading time for this HTML snippet would 89 seconds without the image
        // Adding the 12 additional seconds for the image results in a readng time of over 1.5 minutes, rounded to 2
        String(result).should.equal('2 min read');
    });

    it('[failure] does not render reading time when not post', function () {
        const data = {
            author: {
                name: 'abc 123',
                slug: 'abc123'
            }
        };

        const result = reading_time.call(data);

        should.not.exist(result);
    });
});
