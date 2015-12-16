/* jshint expr:true */
import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';
import Pretender from 'pretender';

describeModule(
    'adapter:user',
    'Integration: Adapter: user',
    {
        integration: true
    },
    function () {
        let server, store;

        beforeEach(function () {
            store = this.container.lookup('service:store');
            server = new Pretender();
        });

        afterEach(function () {
            server.shutdown();
        });

        it('loads users from regular endpoint when all are fetched', function (done) {
            server.get('/ghost/api/v0.1/users/', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({users: [{
                    id: 1,
                    name: 'User 1',
                    slug: 'user-1'
                }, {
                    id: 2,
                    name: 'User 2',
                    slug: 'user-2'
                }]})];
            });

            store.findAll('user', {reload: true}).then((users) => {
                expect(users).to.be.ok;
                expect(users.objectAtContent(0).get('name')).to.equal('User 1');
                done();
            });
        });

        it('loads user from slug endpoint when single user is queried and slug is passed in', function (done) {
            server.get('/ghost/api/v0.1/users/slug/user-1/', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({users: [{
                    id: 1,
                    slug: 'user-1',
                    name: 'User 1'
                }]})];
            });

            store.queryRecord('user', {slug: 'user-1'}).then((user) => {
                expect(user).to.be.ok;
                expect(user.get('name')).to.equal('User 1');
                done();
            });
        });

        it('handles "include" parameter when querying single user via slug', function (done) {
            server.get('/ghost/api/v0.1/users/slug/user-1/', (request) => {
                let params = request.queryParams;
                expect(params.include, 'include query').to.equal('roles,count.posts');

                return [200, {'Content-Type': 'application/json'}, JSON.stringify({users: [{
                    id: 1,
                    slug: 'user-1',
                    name: 'User 1',
                    count: {
                        posts: 5
                    }
                }]})];
            });

            store.queryRecord('user', {slug: 'user-1', include: 'count.posts'}).then((user) => {
                expect(user).to.be.ok;
                expect(user.get('name')).to.equal('User 1');
                expect(user.get('count.posts')).to.equal(5);
                done();
            });
        });
    }
);
