const assert = require('assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');

describe('Members controller', function () {
    let models, membersController, mockMembersService, mockSettingsCache, mockMoment;

    before(function () {
        models = require('../../../../core/server/models');
        models.init();
    });

    beforeEach(function () {
        // Use rewire to load the members controller and replace its dependencies
        membersController = rewire('../../../../core/server/api/endpoints/members');

        // Create mocks
        mockMembersService = {
            processImport: sinon.stub().resolves({
                meta: {stats: {imported: 1}}
            })
        };

        mockSettingsCache = {
            get: sinon.stub().withArgs('timezone').returns('UTC')
        };

        mockMoment = sinon.stub().returns({
            tz: sinon.stub().returnsThis(),
            format: sinon.stub().returns('2023-01-01 12:00')
        });

        // Replace the dependencies in the rewired module
        membersController.__set__('membersService', mockMembersService);
        membersController.__set__('settingsCache', mockSettingsCache);
        membersController.__set__('moment', mockMoment);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('importCSV', function () {
        it('uses frame.user.email when frame.user is present', async function () {
            const mockUser = {
                get: sinon.stub().returns('user@example.com')
            };
            const frame = {
                user: mockUser,
                file: {path: 'test.csv'},
                data: {mapping: {}, labels: []}
            };

            await membersController.importCSV.query(frame);

            // Verify the user's email was used
            assert(mockUser.get.calledWith('email'));
            assert(mockMembersService.processImport.calledWith(sinon.match({
                user: {email: 'user@example.com'}
            })));
        });

        it('uses owner email fallback when frame.user is missing', async function () {
            const mockOwnerUser = {
                get: sinon.stub().returns('owner@example.com')
            };
            sinon.stub(models.User, 'getOwnerUser').resolves(mockOwnerUser);

            const frame = {
                user: null, // No user in frame (integration auth scenario)
                file: {path: 'test.csv'},
                data: {mapping: {}, labels: []}
            };

            await membersController.importCSV.query(frame);

            // Verify the owner fallback path was used
            assert(models.User.getOwnerUser.calledOnce);
            assert(mockOwnerUser.get.calledWith('email'));
            assert(mockMembersService.processImport.calledWith(sinon.match({
                user: {email: 'owner@example.com'}
            })));
        });
    });
});
