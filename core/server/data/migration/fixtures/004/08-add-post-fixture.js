// Adds a new draft post with information about the new design
var models  = require('../../../../models'),

    newPost = {
        title:            'You\'ve been upgraded to the latest version of Ghost',
        slug:             'ghost-0-7',
        markdown:         'You\'ve just upgraded to the latest version of Ghost and we\'ve made a few changes that you should probably know about!\n\n## Woah, why does everything look different?\n\nAfter two years and hundreds of thousands of users, we learned a great deal about what was (and wasn\'t) working in the old Ghost admin user interface. What you\'re looking at is Ghost\'s first major UI refresh, with a strong focus on being more usable and robust all round.\n\n![New Design](https://ghost.org/images/zelda.png)\n\nThe main navigation menu, previously located at the top of your screen, has now moved over to the left. This makes it way easier to work with on mobile devices, and has the added benefit of providing ample space for upcoming features!\n\n## Lost and found: Your old posts\n\nFrom talking to many of you we understand that finding old posts in the admin area was a real pain; so we\'ve added a new magical search bar which lets you quickly find posts for editing, without having to scroll endlessly. Take it for a spin!\n\n![Search](https://ghost.org/images/search.gif)\n\nQuestions? Comments? Send us a tweet [@TryGhost](https://twitter.com/tryghost)\n\nOh, and yes – you can safely delete this draft post!',
        image:            null,
        featured:         false,
        page:             false,
        status:           'draft',
        language:         'en_US',
        meta_title:       null,
        meta_description: null
    },
    message = 'Adding 0.7 upgrade post fixture';

module.exports = function addNewPostFixture(options, logger) {
    return models.Post.findOne({slug: newPost.slug, status: 'all'}, options).then(function (post) {
        if (!post) {
            logger.info(message);
            // Set the published_at timestamp, but keep the post as a draft so doesn't appear on the frontend
            // This is a hack to ensure that this post appears at the very top of the drafts list, because
            // unpublished posts always appear first
            newPost.published_at = Date.now();
            return models.Post.add(newPost, options);
        } else {
            logger.warn(message);
        }
    });
};
