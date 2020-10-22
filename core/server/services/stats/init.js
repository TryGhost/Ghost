/**
 * Stats
 * A collection of utilities for handling stats of the site
 */
const debug = require('ghost-ignition').debug('stats');
const moment = require('moment');
const models = require('../../models');
const db = require('../../data/db');
const {events} = require('../../lib/common');
const templates = require('../../../frontend/services/themes/handlebars/template');

const cache = require('./cache');

async function getOldestPostCreatedDate() {
    const result = await models.Post.query(qb => qb.orderBy('created_at', 'ASC').limit(1)).fetchAll({columns: ['created_at']});

    return result.models && result.models[0] ? result.models[0].get('created_at') : null;
}

async function countTags() {
    const result = await db.knex('posts_tags').join('posts', 'posts.id', '=', 'posts_tags.post_id').where({status: 'published'}).countDistinct('tag_id');

    return result[0]['count(distinct `tag_id`)'];
}

async function countAuthors() {
    const result = await db.knex('posts_authors')
        .join('posts', 'posts.id', '=', 'posts_authors.post_id')
        .where({status: 'published'})
        .countDistinct('posts_authors.author_id');

    return result[0]['count(distinct `posts_authors`.`author_id`)'];
}

async function updateMembers() {
    const totalMembers = (await db.knex('members').count())[0]['count(*)'];
    const paidMembers = (await db.knex('members_stripe_customers').countDistinct('member_id'))[0]['count(distinct `member_id`)'];

    cache.set('total_members', totalMembers);
    cache.set('total_paid_members', paidMembers);
    cache.set('total_free_members', totalMembers - paidMembers);
}

async function updatePosts() {
    cache.set('total_posts', (await db.knex('posts').where({status: 'published'}).count())[0]['count(*)']);
    cache.set('total_members_posts', (await db.knex('posts').where({visibility: 'members', status: 'published'}).count())[0]['count(*)']);
    cache.set('total_paid_members_posts', (await db.knex('posts').where({visibility: 'paid', status: 'published'}).count())[0]['count(*)']);
    cache.set('total_tags', await countTags());
    cache.set('total_authors', await countAuthors());
}

async function updateSiteCreatedDate() {
    const siteCreatedAt = await getOldestPostCreatedDate();

    cache.set('site_age', function () {
        return siteCreatedAt ? Date.now() - siteCreatedAt : 0;
    });

    cache.set('site_age_years', function () {
        return siteCreatedAt ? moment(Date.now()).diff(siteCreatedAt, 'years') : 0;
    });
}

module.exports = async function init() {
    await updateMembers();
    await updatePosts();
    await updateSiteCreatedDate();

    debug('Current stats', this.getAll());

    // Set up events

    // We don't update for post.deleted
    // because post.unpublished is emitted when deleting a published post.
    const postEvents = ['post.published', 'post.unpublished', 'post.visibility.changed'];

    postEvents.forEach((event) => {
        events.on(event, async () => {
            await updatePosts();
            await updateSiteCreatedDate();

            templates.updateGlobalTemplateOptions();
        });
    });

    const memberEvents = ['member.added', 'member.deleted', 'member.edited', 'customer.added', 'customer.deleted'];

    memberEvents.forEach((event) => {
        events.on(event, async () => {
            await updateMembers();

            templates.updateGlobalTemplateOptions();
        });
    });

    events.on('tag.deleted', async () => {
        cache.set('total_tags', await countTags());

        templates.updateGlobalTemplateOptions();
    });

    events.on('user.deleted', async () => {
        cache.set('total_authors', await countAuthors());

        templates.updateGlobalTemplateOptions();
    });
};
