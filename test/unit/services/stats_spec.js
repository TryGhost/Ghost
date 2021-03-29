const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');

const Stats = require('../../../core/server/services/stats');
const MembersStats = require('../../../core/server/services/members/stats');
const settingsCache = require('../../../core/server/services/settings/cache');
const db = require('../../../core/server/data/db');
const config = require('../../../core/shared/config');

describe('Stats Service', function () {
    afterEach(function () {
        sinon.restore();
        before(async function () {
            const stats = new Stats ({
                db: db,
                settingsCache: settingsCache,
                isSQLite: config.get('database:client') === 'sqlite3'
            })
    
        });
    });


    it('total posts', async function () {
        const stats = new Stats ({
            db: db,
            settingsCache: settingsCache,
            isSQLite: config.get('database:client') === 'sqlite3'
        })
        const result = await stats.getTotalPosts()
        console.log(result)
        
    });
    /*
    it('total posts 2', async function () {
        const stats = new Stats ({
            db: db,
            settingsCache: settingsCache,
            isSQLite: config.get('database:client') === 'sqlite3'
        })
        const result = await stats.getTotalPosts2()
        console.log(result)
        
    });*/
    it('total members', async function () {
        const stats = new Stats ({
            db: db,
            settingsCache: settingsCache,
            isSQLite: config.get('database:client') === 'sqlite3'
        })
        const result = await stats.getTotalMembers()
        console.log(result)
    });
    it('what are posts?', async function () {
        const stats = new Stats ({
            db: db,
            settingsCache: settingsCache,
            isSQLite: config.get('database:client') === 'sqlite3'
        })
        const result = await stats.testPosts()
        console.log(result)
    });
    it('who are members?', async function () {
        const stats = new Stats ({
            db: db,
            settingsCache: settingsCache,
            isSQLite: config.get('database:client') === 'sqlite3'
        })
        const result = await stats.testMembers()
        console.log(result)
    });

    

    /*
    it('total members with MembersStats', function () {
        const mStats = new MembersStats ({
            db: db,
            settingsCache: settingsCache,
            isSQLite: config.get('database:client') === 'sqlite3'
        })
        const promise = mStats.getTotalMembers()
        promise.then(function(result) {
            console.log(result + " jäsentä testissä 2") // "Some User token"
         })
    });*/

});