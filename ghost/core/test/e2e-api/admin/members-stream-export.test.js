// @ts-nocheck - Disable TypeScript checking to avoid model typing issues
const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');

const should = require('should');
const Papa = require('papaparse');
const sinon = require('sinon');
const models = require('../../../core/server/models');
const membersService = require('../../../core/server/services/members');

let agent;

/**
 * Creates a large number of test members for export testing
 * @param {number} count - Number of test members to create
 */
async function createTestMembers(count) {
    const members = [];
    for (let i = 0; i < count; i++) {
        const member = await models.Member.add({
            email: `test-stream-${i}@example.com`,
            name: `Test Member ${i}`,
            note: `Test note for member ${i}`,
            email_disabled: false
        });
        members.push(member);
    }
    return members;
}

describe('Members Streaming Export', function () {
    let exportStub;
    
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
        
        // Create test members
        await createTestMembers(10);
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
        sinon.restore();
    });
    
    it('Uses streaming export for large member counts', async function () {
        // Only stub the count check, not the actual data fetch
        const originalFindPage = models.Member.findPage;
        sinon.stub(models.Member, 'findPage').callsFake(async function (options) {
            // Only modify the count check
            if (options && options.limit === 0) {
                return {
                    meta: {
                        pagination: {
                            total: 20000 // Pretend we have 20k members
                        }
                    }
                };
            }
            
            // For all other calls, use the original method to ensure we get actual data
            return originalFindPage.apply(this, arguments);
        });
        
        // Add a spy on the membersService.export function
        exportStub = sinon.spy(membersService, 'export');
        
        const res = await agent
            .get(`/members/upload/?limit=all`)
            .expectStatus(200)
            .expectEmptyBody(); // express-test body parsing doesn't support CSV
        
        // Verify the export function was called with stream=true
        should(exportStub.calledOnce).be.true('Expected membersService.export to be called once');
        should(exportStub.firstCall.args[0].stream).be.true('Expected stream:true option to be passed to export');
        
        // Verify the response is properly formatted CSV
        res.text.should.match(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers/);
        
        // Parse the CSV and verify content
        const csv = Papa.parse(res.text, {header: true});
        
        // Verify we're seeing data in the export
        should(csv.data.length).be.greaterThan(0, 'Expected data in CSV output');
        
        // Check for newlines in the original response (ensuring proper CSV formatting)
        const newlineCount = (res.text.match(/\n/g) || []).length;
        should(newlineCount).be.greaterThan(0, 'Expected newlines in CSV (for header and data rows)');
    });
}); 