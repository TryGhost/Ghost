const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const DataGenerator = require('../../utils/fixtures/data-generator');
const _ = require('lodash');

// Stuff we are testing
const events = require('../../../core/server/lib/common/events');

const imageLib = require('../../../core/server/lib/image');
const UserModel = require('../../../core/server/models/user').User;
const RoleModel = require('../../../core/server/models/role').Role;
const context = testUtils.context.admin;

describe('User Model', function run() {
    let eventsTriggered = {};

    before(testUtils.teardownDb);
    afterEach(testUtils.teardownDb);
    afterEach(function () {
        sinon.restore();
    });

    before(function () {
        assertExists(UserModel);
    });

    describe('Registration', function runRegistration() {
        beforeEach(testUtils.setup('roles'));

        it('can add first', async function () {
            const userData = testUtils.DataGenerator.forModel.users[0];
            const createdUser = await UserModel.add(userData, context);

            assertExists(createdUser);
            assert.notEqual(createdUser.attributes.password, userData.password, 'password was hashed');
            assert.equal(createdUser.attributes.email, userData.email, 'email address correct');
        });

        it('shortens slug if possible', async function () {
            const userData = testUtils.DataGenerator.forModel.users[2];
            const createdUser = await UserModel.add(userData, context);

            assertExists(createdUser);
            assert.equal(createdUser.has('slug'), true);
            assert.equal(createdUser.attributes.slug, 'jimothy');
        });

        it('does not short slug if not possible', async function () {
            const userData = testUtils.DataGenerator.forModel.users[2];

            let createdUser = await UserModel.add(userData, context);
            assertExists(createdUser);
            assert.equal(createdUser.has('slug'), true);
            assert.equal(createdUser.attributes.slug, 'jimothy');

            userData.email = 'newmail@mail.com';
            createdUser = await UserModel.add(userData, context);
            assertExists(createdUser);
            assert.equal(createdUser.has('slug'), true);
            assert.equal(createdUser.attributes.slug, 'jimothy-bogendath');

            userData.email = 'newmail2@mail.com';
            createdUser = await UserModel.add(userData, context);
            assertExists(createdUser);
            assert.equal(createdUser.has('slug'), true);
            assert.equal(createdUser.attributes.slug, 'jimothy-bogendath-2');
        });

        it('does NOT lowercase email', async function () {
            const userData = testUtils.DataGenerator.forModel.users[2];
            const createdUser = await UserModel.add(userData, context);

            assertExists(createdUser);
            assert.equal(createdUser.attributes.email, userData.email, 'email address correct');
        });

        it('can find gravatar', async function () {
            const userData = testUtils.DataGenerator.forModel.users[4];

            sinon.stub(imageLib.gravatar, 'lookup').callsFake(function (data) {
                data.image = 'http://www.gravatar.com/avatar/2fab21a4c4ed88e76add10650c73bae1?d=404';
                return Promise.resolve(data);
            });

            const createdUser = await UserModel.add(userData, context);
            assertExists(createdUser);
            assert.equal(createdUser.attributes.profile_image, 'http://www.gravatar.com/avatar/2fab21a4c4ed88e76add10650c73bae1?d=404', 'Gravatar found');
        });

        it('can handle no gravatar', async function () {
            const userData = testUtils.DataGenerator.forModel.users[0];

            sinon.stub(imageLib.gravatar, 'lookup').callsFake(function (data) {
                return Promise.resolve(data);
            });

            const createdUser = await UserModel.add(userData, context);
            assertExists(createdUser);
            assert.equal(createdUser.image, undefined);
        });

        it('can find by email and is case insensitive', async function () {
            const userData = testUtils.DataGenerator.forModel.users[2];
            const email = testUtils.DataGenerator.forModel.users[2].email;

            await UserModel.add(userData, context);

            // Test same case
            let user = await UserModel.getByEmail(email);
            assertExists(user);
            assert.equal(user.attributes.email, email);

            // Test entered in lowercase
            user = await UserModel.getByEmail(email.toLowerCase());
            assertExists(user);
            assert.equal(user.attributes.email, email);

            // Test entered in uppercase
            user = await UserModel.getByEmail(email.toUpperCase());
            assertExists(user);
            assert.equal(user.attributes.email, email);

            // Test incorrect email address - swapped capital O for number 0
            user = await UserModel.getByEmail('jb0gendAth@example.com');
            assert.equal(user, undefined);
        });
    });

    describe('Basic Operations', function () {
        beforeEach(testUtils.setup('users:roles'));

        beforeEach(function () {
            eventsTriggered = {};
            sinon.stub(events, 'emit').callsFake(function (eventName, eventObj) {
                if (!eventsTriggered[eventName]) {
                    eventsTriggered[eventName] = [];
                }

                eventsTriggered[eventName].push(eventObj);
            });
        });

        it('sets last login time on successful login', async function () {
            const userData = testUtils.DataGenerator.forModel.users[0];
            const activeUser = await UserModel.check({email: userData.email, password: userData.password});

            assertExists(activeUser.get('last_seen'));
        });

        it('converts fetched dateTime fields to Date objects', async function () {
            const userData = testUtils.DataGenerator.forModel.users[0];
            const checkedUser = await UserModel.check({email: userData.email, password: userData.password});
            const user = await UserModel.findOne({id: checkedUser.id});

            assertExists(user);

            const lastLogin = user.get('last_seen');
            const createdAt = user.get('created_at');
            const updatedAt = user.get('updated_at');

            assert(lastLogin instanceof Date);
            assert(createdAt instanceof Date);
            assert(updatedAt instanceof Date);
        });

        it('can findPage with limit all', async function () {
            await testUtils.fixtures.createExtraUsers();
            const results = await UserModel.findPage({limit: 'all'});

            assert.equal(results.meta.pagination.page, 1);
            assert.equal(results.meta.pagination.limit, 'all');
            assert.equal(results.meta.pagination.pages, 1);
            assert.equal(results.data.length, 10);
        });

        it('can findOne by role name', async function () {
            await testUtils.fixtures.createExtraUsers();

            const results = await Promise.all([
                UserModel.findOne({role: 'Owner'}),
                UserModel.findOne({role: 'Editor'})
            ]);
            let owner = results[0];
            let editor = results[1];

            assertExists(owner);
            assertExists(editor);

            owner = owner.toJSON();
            editor = editor.toJSON();

            assertExists(owner.roles);
            assertExists(editor.roles);

            assert.equal(owner.roles[0].name, 'Owner');
            assert.equal(editor.roles[0].name, 'Editor');
        });

        it('can add active user', async function () {
            const userData = testUtils.DataGenerator.forModel.users[4];
            const role = await RoleModel.findOne();

            userData.roles = [role.toJSON()];

            const createdUser = await UserModel.add(userData, _.extend({}, context, {withRelated: ['roles']}));
            assertExists(createdUser);
            assert.notEqual(createdUser.get('password'), userData.password, 'password was hashed');
            assert.equal(createdUser.get('email'), userData.email, 'email address correct');
            assert.equal(createdUser.related('roles').toJSON()[0].name, 'Administrator', 'role set correctly');

            assert.equal(Object.keys(eventsTriggered).length, 2);
            assertExists(eventsTriggered['user.added']);
            assertExists(eventsTriggered['user.activated']);
        });

        it('can NOT add active user with invalid email address', async function () {
            const userData = _.clone(testUtils.DataGenerator.forModel.users[4]);
            const role = await RoleModel.findOne();

            userData.email = 'invalidemailaddress';
            userData.roles = [role.toJSON()];

            await assert.rejects(UserModel.add(userData, _.extend({}, context, {withRelated: ['roles']})));
        });

        it('can edit active user', async function () {
            const firstUser = testUtils.DataGenerator.Content.users[0].id;
            const results = await UserModel.findOne({id: firstUser});

            assertExists(results);
            const user = results.toJSON();
            assert.equal(user.id, firstUser);
            assert.equal(user.website, null);

            const edited = await UserModel.edit({website: 'http://some.newurl.com'}, {id: firstUser});
            assertExists(edited);
            assert.equal(edited.attributes.website, 'http://some.newurl.com');

            assert.equal(Object.keys(eventsTriggered).length, 2);
            assertExists(eventsTriggered['user.activated.edited']);
            assertExists(eventsTriggered['user.edited']);
        });

        it('can NOT set an invalid email address', async function () {
            const firstUser = testUtils.DataGenerator.Content.users[0].id;
            await assert.rejects(UserModel.edit({email: 'notanemailaddress'}, {id: firstUser}), (err) => {
                assert.equal(err[0] instanceof errors.ValidationError, true);
                return true;
            });
        });

        it('can NOT set an already existing email address', async function () {
            const firstUser = testUtils.DataGenerator.Content.users[0];
            const secondUser = testUtils.DataGenerator.Content.users[1];

            await assert.rejects(UserModel.edit({email: secondUser.email}, {id: firstUser.id}), errors.ValidationError);
        });
    });

    describe('Password change', function () {
        beforeEach(testUtils.setup('users:roles'));

        describe('error', function () {
            it('wrong old password', async function () {
                await assert.rejects(UserModel.changePassword({
                    newPassword: '1234567890',
                    ne2Password: '1234567890',
                    oldPassword: '123456789',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner), errors.ValidationError);
            });

            it('too short password', async function () {
                await assert.rejects(UserModel.changePassword({
                    newPassword: '12345678',
                    ne2Password: '12345678',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner), errors.ValidationError);
            });

            it('very bad password', async function () {
                await assert.rejects(UserModel.changePassword({
                    newPassword: '1234567890',
                    ne2Password: '1234567890',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner), errors.ValidationError);
            });

            it('password matches users email adress', async function () {
                await assert.rejects(UserModel.changePassword({
                    newPassword: 'jbloggs@example.com',
                    ne2Password: 'jbloggs@example.com',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner), errors.ValidationError);
            });

            it('password contains words "ghost" or "password"', async function () {
                await assert.rejects(UserModel.changePassword({
                    newPassword: 'onepassword',
                    ne2Password: 'onepassword',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner), errors.ValidationError);
            });

            it('password matches blog URL', async function () {
                const blogUrl = new URL(config.get('url'));
                const blogHostPassword = blogUrl.host;

                await assert.rejects(UserModel.changePassword({
                    newPassword: blogHostPassword,
                    ne2Password: blogHostPassword,
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner), errors.ValidationError);
            });

            it('password contains repeating chars', async function () {
                await assert.rejects(UserModel.changePassword({
                    newPassword: 'cdcdcdcdcd',
                    ne2Password: 'cdcdcdcdcd',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner), errors.ValidationError);
            });

            it('password contains repeating numbers', async function () {
                await assert.rejects(UserModel.changePassword({
                    newPassword: '1231111111',
                    ne2Password: '1231111111',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner), errors.ValidationError);
            });
        });
    });

    describe('User setup', function () {
        beforeEach(testUtils.setup('owner'));

        it('setup user', async function () {
            const userData = {
                name: 'Max Mustermann',
                email: 'test@ghost.org',
                password: 'thisissupersafe'
            };
            const user = await UserModel.setup(userData, {id: DataGenerator.Content.users[0].id});

            assert.equal(user.get('name'), userData.name);
            assert.equal(user.get('email'), userData.email);
            assert.equal(user.get('slug'), 'max');

            // naive check that password was hashed
            assert.notEqual(user.get('password'), userData.password);
        });
    });
});
