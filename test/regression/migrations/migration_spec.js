var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    Models = require('../../../core/server/models');

describe('Database Migration (special functions)', function () {
    before(testUtils.teardownDb);
    afterEach(testUtils.teardownDb);
    afterEach(function () {
        sinon.restore();
    });

    describe('Fixtures', function () {
        // Custom assertion for detection that a permissions is assigned to the correct roles
        should.Assertion.add('AssignedToRoles', function (roles) {
            var roleNames;
            this.params = {operator: 'to have role'};

            should.exist(this.obj);

            this.obj.should.be.an.Object().with.property(['roles']);
            this.obj.roles.should.be.an.Array();

            // Ensure the roles are in id order
            roleNames = _(this.obj.roles).sortBy('id').map('name').value();
            roleNames.should.eql(roles);
        });

        // Custom assertion to wrap all permissions
        should.Assertion.add('CompletePermissions', function () {
            this.params = {operator: 'to have a complete set of permissions'};
            var permissions = this.obj;

            // DB
            permissions[0].name.should.eql('Export database');
            permissions[0].should.be.AssignedToRoles(['Administrator', 'DB Backup Integration']);
            permissions[1].name.should.eql('Import database');
            permissions[1].should.be.AssignedToRoles(['Administrator', 'DB Backup Integration']);
            permissions[2].name.should.eql('Delete all content');
            permissions[2].should.be.AssignedToRoles(['Administrator', 'DB Backup Integration']);

            // Mail
            permissions[3].name.should.eql('Send mail');
            permissions[3].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Notifications
            permissions[4].name.should.eql('Browse notifications');
            permissions[4].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[5].name.should.eql('Add notifications');
            permissions[5].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[6].name.should.eql('Delete notifications');
            permissions[6].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);

            // Posts
            permissions[7].name.should.eql('Browse posts');
            permissions[7].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[8].name.should.eql('Read posts');
            permissions[8].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[9].name.should.eql('Edit posts');
            permissions[9].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[10].name.should.eql('Add posts');
            permissions[10].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[11].name.should.eql('Delete posts');
            permissions[11].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);

            // Settings
            permissions[12].name.should.eql('Browse settings');
            permissions[12].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[13].name.should.eql('Read settings');
            permissions[13].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[14].name.should.eql('Edit settings');
            permissions[14].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Slugs
            permissions[15].name.should.eql('Generate slugs');
            permissions[15].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);

            // Tags
            permissions[16].name.should.eql('Browse tags');
            permissions[16].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[17].name.should.eql('Read tags');
            permissions[17].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[18].name.should.eql('Edit tags');
            permissions[18].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[19].name.should.eql('Add tags');
            permissions[19].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Admin Integration']);
            permissions[20].name.should.eql('Delete tags');
            permissions[20].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);

            // Themes
            permissions[21].name.should.eql('Browse themes');
            permissions[21].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[22].name.should.eql('Edit themes');
            permissions[22].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[23].name.should.eql('Activate themes');
            permissions[23].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[24].name.should.eql('Upload themes');
            permissions[24].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[25].name.should.eql('Download themes');
            permissions[25].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[26].name.should.eql('Delete themes');
            permissions[26].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Users
            permissions[27].name.should.eql('Browse users');
            permissions[27].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[28].name.should.eql('Read users');
            permissions[28].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[29].name.should.eql('Edit users');
            permissions[29].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[30].name.should.eql('Add users');
            permissions[30].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[31].name.should.eql('Delete users');
            permissions[31].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);

            // Roles
            permissions[32].name.should.eql('Assign a role');
            permissions[32].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[33].name.should.eql('Browse roles');
            permissions[33].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);

            // Invites
            permissions[34].name.should.eql('Browse invites');
            permissions[34].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[35].name.should.eql('Read invites');
            permissions[35].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[36].name.should.eql('Edit invites');
            permissions[36].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[37].name.should.eql('Add invites');
            permissions[37].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[38].name.should.eql('Delete invites');
            permissions[38].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);

            // Redirects
            permissions[39].name.should.eql('Download redirects');
            permissions[39].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[40].name.should.eql('Upload redirects');
            permissions[40].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Webhooks
            permissions[41].name.should.eql('Add webhooks');
            permissions[41].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[42].name.should.eql('Edit webhooks');
            permissions[42].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);
            permissions[43].name.should.eql('Delete webhooks');
            permissions[43].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Integrations
            permissions[44].name.should.eql('Browse integrations');
            permissions[44].should.be.AssignedToRoles(['Administrator']);
            permissions[45].name.should.eql('Read integrations');
            permissions[45].should.be.AssignedToRoles(['Administrator']);
            permissions[46].name.should.eql('Edit integrations');
            permissions[46].should.be.AssignedToRoles(['Administrator']);
            permissions[47].name.should.eql('Add integrations');
            permissions[47].should.be.AssignedToRoles(['Administrator']);
            permissions[48].name.should.eql('Delete integrations');
            permissions[48].should.be.AssignedToRoles(['Administrator']);

            // API Keys
            permissions[49].name.should.eql('Browse API keys');
            permissions[49].should.be.AssignedToRoles(['Administrator']);
            permissions[50].name.should.eql('Read API keys');
            permissions[50].should.be.AssignedToRoles(['Administrator']);
            permissions[51].name.should.eql('Edit API keys');
            permissions[51].should.be.AssignedToRoles(['Administrator']);
            permissions[52].name.should.eql('Add API keys');
            permissions[52].should.be.AssignedToRoles(['Administrator']);
            permissions[53].name.should.eql('Delete API keys');
            permissions[53].should.be.AssignedToRoles(['Administrator']);

            // Actions
            permissions[54].name.should.eql('Browse Actions');
            permissions[54].should.be.AssignedToRoles(['Administrator', 'Admin Integration']);

            // Members
            permissions[55].name.should.eql('Browse Members');
            permissions[56].name.should.eql('Read Members');
            permissions[57].name.should.eql('Edit Members');
            permissions[58].name.should.eql('Add Members');
            permissions[59].name.should.eql('Delete Members');

            // Posts
            permissions[60].name.should.eql('Publish posts');
            permissions[60].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration', 'Scheduler Integration']);

            // DB
            permissions[61].name.should.eql('Backup database');
            permissions[61].should.be.AssignedToRoles(['Administrator', 'DB Backup Integration']);

            // Bulk Email
            permissions[62].name.should.eql('Email preview');
            permissions[62].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[63].name.should.eql('Send test email');
            permissions[63].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[64].name.should.eql('Browse emails');
            permissions[64].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[65].name.should.eql('Read emails');
            permissions[65].should.be.AssignedToRoles(['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions[66].name.should.eql('Retry emails');
            permissions[66].should.be.AssignedToRoles(['Administrator', 'Editor', 'Admin Integration']);
            permissions[67].name.should.eql('Browse labels');
            permissions[68].name.should.eql('Read labels');
            permissions[69].name.should.eql('Edit labels');
            permissions[70].name.should.eql('Add labels');
            permissions[71].name.should.eql('Delete labels');
            permissions[72].name.should.eql('Read member signin urls');
        });

        describe('Populate', function () {
            beforeEach(testUtils.setup('default'));

            it('should populate all fixtures correctly', function () {
                var props = {
                    posts: Models.Post.findAll({withRelated: ['tags']}),
                    tags: Models.Tag.findAll(),
                    users: Models.User.findAll({
                        filter: 'status:inactive',
                        context: {internal: true},
                        withRelated: ['roles']
                    }),
                    roles: Models.Role.findAll(),
                    permissions: Models.Permission.findAll({withRelated: ['roles']})
                };

                return Promise.props(props).then(function (result) {
                    should.exist(result);

                    // Post
                    should.exist(result.posts);
                    result.posts.length.should.eql(7);
                    result.posts.at(0).get('title').should.eql('Welcome to Ghost');
                    result.posts.at(6).get('title').should.eql('Creating a custom theme');

                    // Tag
                    should.exist(result.tags);
                    result.tags.length.should.eql(1);
                    result.tags.at(0).get('name').should.eql('Getting Started');

                    // Post Tag relation
                    result.posts.at(0).related('tags').length.should.eql(1);
                    result.posts.at(0).related('tags').at(0).get('name').should.eql('Getting Started');

                    // User (Owner)
                    should.exist(result.users);
                    result.users.length.should.eql(1);
                    result.users.at(0).get('name').should.eql('Ghost');
                    result.users.at(0).get('status').should.eql('inactive');
                    result.users.at(0).related('roles').length.should.eql(1);
                    result.users.at(0).related('roles').at(0).get('name').should.eql('Owner');

                    // Roles
                    should.exist(result.roles);
                    result.roles.length.should.eql(8);
                    result.roles.at(0).get('name').should.eql('Administrator');
                    result.roles.at(1).get('name').should.eql('Editor');
                    result.roles.at(2).get('name').should.eql('Author');
                    result.roles.at(3).get('name').should.eql('Contributor');
                    result.roles.at(4).get('name').should.eql('Owner');
                    result.roles.at(5).get('name').should.eql('Admin Integration');
                    result.roles.at(6).get('name').should.eql('DB Backup Integration');
                    result.roles.at(7).get('name').should.eql('Scheduler Integration');

                    // Permissions
                    result.permissions.length.should.eql(74);
                    result.permissions.toJSON().should.be.CompletePermissions();
                });
            });
        });
    });
});
