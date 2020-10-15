/**
 * Stats
 * A collection of utilities for handling stats of the site
 */
const debug = require('ghost-ignition').debug('stats');
const moment = require('moment');
const models = require('../models');
const {events} = require('../lib/common');

const stats = {};

async function getOldestPostCreatedDate() {
    const result = models.Post.query(qb => qb.orderBy('created_at', 'ASC').limit(1)).fetchAll({columns: ['created_at']});

    return result.models[0] ? result.models[0] : null;
}

module.exports = {
    async init() {
        await this.updateMembers();
        await this.updatePosts();
        await this.updateSiteCreatedDate();

        debug('Current stats', this.getAll());

        // Set up events
        const postEvents = ['post.published', 'post.unpublished', 'post.deleted'];

        postEvents.forEach((event) => {
            events.on(event, async () => {
                await this.updatePosts();
                await this.updateSiteCreatedDate();

                events.emit('updateGlobalTemplateOptions');
            });
        });

        const memberEvents = ['member.added', 'member.deleted', 'member.edited'];

        memberEvents.forEach((event) => {
            events.on(event, async () => {
                await this.updateMembers();

                events.emit('updateGlobalTemplateOptions');
            });
        });
    },

    async updateMembers() {
        stats.total_members = await models.Member.count();
    },

    async updatePosts() {
        stats.total_posts = await models.Post.count();
        stats.total_members_posts = await models.Post.where('visibility', 'member').count();
        stats.total_paid_members_posts = await models.Post.where('visibility', 'paid').count();
        stats.total_tags = await models.Tag.count();
        stats.total_authors = await models.Author.count();
    },

    async updateSiteCreatedDate() {
        const siteCreatedAt = await getOldestPostCreatedDate();

        Object.assign(stats, {
            get site_age() {
                return siteCreatedAt ? Date.now() - siteCreatedAt : 0;
            },

            get site_age_years() {
                return siteCreatedAt ? moment(Date.now()).diff(siteCreatedAt, 'years') : 0;
            }
        });
    },

    get(key) {
        return stats[key];
    },

    getAll() {
        return stats;
    }
};
