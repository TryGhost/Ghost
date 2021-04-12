//stats helper
const Promise = require('bluebird');

class Stats {
    /**
     * @param {Object} config
     * @param {Object} config.db - an instance holding knex connection to the database
     * @param {Object} config.settingsCache - an instance of the Ghost Settings Cache
     * @param {Boolean} config.isSQLite - flag identifying if storage is connected to SQLite
     */
    constructor({db, settingsCache, isSQLite}) {
        this._db = db;
        this._settingsCache = settingsCache;
        this._isSQLite = isSQLite;
    }

    /**
     * Fetches count of all members
     */
    async getTotalMembers() {
        const result = await this._db.knex.raw('SELECT COUNT(id) AS total FROM members');
        return this._isSQLite ? result[0].total : result[0][0].total;
    }

    /**
     * Fetches count of all posts
     */
    async getTotalPosts() {
        const result = await this._db.knex.raw('SELECT COUNT(id) AS total FROM posts');
        return this._isSQLite ? result[0].total : result[0][0].total;
    }

    /**
     * Fetches count of all authors
     */
    async getTotalAuthors() {
        const result = await this._db.knex.raw('SELECT COUNT(DISTINCT author_id) AS total FROM posts');
        return this._isSQLite ? result[0].total : result[0][0].total;
    }
    /** 
     * Fetches count of all member posts
     */
    async getTotalMemberPosts() {
        const result = await this._db.knex.raw('SELECT COUNT(id) AS total FROM posts WHERE visibility = members AND status = published');
        return this._isSQLite ? result[0].total : result[0][0].total;
    }

    /**
     * Fetches count of all tags
     */
     async getTotalTags() {
        const result = await this._db.knex.raw('SELECT COUNT(id) AS total FROM tags');
        return this._isSQLite ? result[0].total : result[0][0].total;
     }
    /** 
     * Fetches count of all paid member posts
     */
    async getTotalPaidMemberPosts() {
        const result = await this._db.knex.raw('SELECT COUNT(id) AS total FROM posts WHERE visibility = paid AND status = published');
        return this._isSQLite ? result[0].total : result[0][0].total;
    }

    /**
     * Fetches all stats
     *
     */
    async fetch() {
        const totalMembers = await this.getTotalMembers();
        const totalPosts = await this.getTotalMembers();
        const totalMemberPosts = await this.getTotalMemberPosts();
        const totalPaidMemberPosts = await this.getTotalPaidMemberPosts();

        return Promise.props({
            totalMembers: totalMembers,
            totalPosts: totalPosts,
            totalMemberPosts: totalMemberPosts,
            totalPaidMemberPosts: totalPaidMemberPosts

        });
    }
    // testing the content that the data fetched from the db contains
    async testPosts() {
        return this._db.knex.raw('SELECT title FROM posts');
    }
    async testMembers() {
        return this._db.knex.raw('SELECT name FROM members');
    }
    async testMemberPosts() {
        return this._db.knex.raw('SELECT COUNT(id) AS total FROM posts WHERE visibility = members AND status = published');
    }
    async testPaidMemberPosts() {
        return this._db.knex.raw('SELECT COUNT(id) AS total FROM posts WHERE visibility = paid AND status = published');
    }
    async testAuthors() { 
        return this._db.knex.raw('SELECT COUNT(DISTINCT author_id) AS total FROM posts');
    }
    async testTags() {
        return this._db.knex.raw('SELECT COUNT(id) AS total FROM tags');
    }

}

module.exports = Stats;
