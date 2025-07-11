const {test, expect} = require('@playwright/test');
const factoryLib = require('../../factory');

test.describe('Error Handling Tests', () => {
    let db;
    let factory;
    const createdMembers = [];
    
    test.beforeAll(async () => {
        await factoryLib.setupFactory();
        factory = factoryLib.getFactory();
        db = factory.knex;
    });
    
    test.afterEach(async () => {
        // Clean up any created members
        if (createdMembers.length > 0) {
            await db('members').whereIn('id', createdMembers).delete();
            createdMembers.length = 0;
        }
    });
    
    test.afterAll(async () => {
        
    });

    test('should throw error for invalid post status', async () => {
        await expect(async () => {
            await factory.posts()
                .withTitle('Invalid Status Post')
                .withStatus('invalid-status')
                .create();
        }).rejects.toThrow('Invalid post status: invalid-status. Must be \'draft\', \'published\', \'scheduled\', or \'sent\'');
    });

    test('should throw error for invalid post visibility', async () => {
        await expect(async () => {
            await factory.posts()
                .withTitle('Invalid Visibility Post')
                .withVisibility('invalid-visibility')
                .create();
        }).rejects.toThrow('Invalid visibility: invalid-visibility');
    });

    test('should throw error for invalid member status', async () => {
        await expect(async () => {
            await factory.members()
                .withEmail('test@example.com')
                .withStatus('invalid-status')
                .create();
        }).rejects.toThrow('Invalid member status: invalid-status. Must be \'free\', \'paid\', or \'comped\'');
    });

    test('should handle database constraint errors', async () => {
        // Create a member
        const member = await factory.createFreeMember({
            email: `unique-${Date.now()}@example.com`
        });
        createdMembers.push(member.id);
        
        // Try to create another member with the same email
        await expect(async () => {
            await factory.createFreeMember({
                email: member.email
            });
        }).rejects.toThrow();
    });
});