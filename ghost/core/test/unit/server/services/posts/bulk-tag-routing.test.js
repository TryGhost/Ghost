const sinon = require('sinon');
const should = require('should');
const events = require('../../../../../core/server/lib/common/events');
const {PostsService} = require('../../../../../core/server/services/posts/posts-service');

describe('Posts Service - Bulk Tag Operations', function () {
    let postsService;
    let eventsEmitStub;
    
    beforeEach(function () {
        // Mock dependencies
        const mockModels = {
            Post: {
                findAll: sinon.stub(),
                findOne: sinon.stub(),
                getFilteredCollectionQuery: sinon.stub(),
                bulkEdit: sinon.stub(),
                addActions: sinon.stub(),
                transaction: sinon.stub()
            },
            Tag: {
                add: sinon.stub()
            },
            Member: {
                findPage: sinon.stub()
            },
            Product: {
                findAll: sinon.stub()
            }
        };
        
        postsService = new PostsService({
            models: mockModels,
            urlUtils: {},
            isSet: sinon.stub(),
            stats: {},
            emailService: {},
            postsExporter: {}
        });
        
        // Stub events
        eventsEmitStub = sinon.stub(events, 'emit');
    });
    
    afterEach(function () {
        sinon.restore();
    });
    
    describe('bulkEdit - addTag action', function () {
        it('should emit events synchronously for routing update when adding tags in bulk', async function () {
            // Setup test data
            const mockPosts = [
                {id: 'post1'},
                {id: 'post2'},
                {id: 'post3'}
            ];
            
            const mockTag = {
                id: 'tag1',
                name: 'easy'
            };
            
            // Setup mocks
            postsService.models.Post.getFilteredCollectionQuery.returns({
                select: sinon.stub().resolves(mockPosts)
            });
            
            postsService.models.Tag.add.resolves({id: mockTag.id});
            postsService.models.Post.addActions.resolves();
            
            // Mock Post.findAll for fetching updated posts
            postsService.models.Post.findAll.resolves({
                models: [
                    {id: 'post1', get: (field) => field === 'status' ? 'published' : 'post1'},
                    {id: 'post2', get: (field) => field === 'status' ? 'published' : 'post2'},
                    {id: 'post3', get: (field) => field === 'status' ? 'published' : 'post3'}
                ]
            });
            
            // Use real transaction for the test
            postsService.models.Post.transaction.callsFake(async (fn) => {
                const mockTransacting = sinon.stub();
                mockTransacting.withArgs('posts_tags').returns({
                    insert: sinon.stub().resolves()
                });
                return await fn(mockTransacting);
            });
            
            // Call the bulkEdit method with addTag action
            const result = await postsService.bulkEdit(
                {
                    action: 'addTag',
                    meta: {
                        tags: [mockTag]
                    }
                },
                {
                    filter: 'status:published',
                    context: {}
                }
            );
            
            // Verify the result
            should(result).have.property('successful', 3);
            should(result).have.property('unsuccessful', 0);
            should(result).have.property('editIds');
            result.editIds.should.eql(['post1', 'post2', 'post3']);
            
            // Verify events were emitted synchronously for each post
            // Should have 2 events per post: post.published.edited + tag.attached
            eventsEmitStub.callCount.should.equal(6);
            eventsEmitStub.calledWith('post.published.edited').should.be.true();
            eventsEmitStub.calledWith('tag.attached').should.be.true();
        });
    });
    
    describe('bulkEdit - unpublish action', function () {
        it('should emit events synchronously for routing update when unpublishing posts in bulk', async function () {
            // Setup test data
            const mockPosts = [
                {id: 'post1'},
                {id: 'post2'}
            ];
            
            // Setup mocks
            postsService.models.Post.getFilteredCollectionQuery.returns({
                select: sinon.stub().resolves(mockPosts)
            });
            
            postsService.models.Post.bulkEdit.resolves({
                successful: 2,
                unsuccessful: 0
            });
            
            postsService.models.Post.addActions.resolves();
            
            // Mock Post.findAll for fetching updated posts after unpublishing
            postsService.models.Post.findAll.resolves({
                models: [
                    {id: 'post1', get: (field) => field === 'status' ? 'draft' : 'post1'},
                    {id: 'post2', get: (field) => field === 'status' ? 'draft' : 'post2'}
                ]
            });
            
            // Use real transaction for the test
            postsService.models.Post.transaction.callsFake(async (fn) => {
                return await fn({});
            });
            
            // Call the bulkEdit method with unpublish action
            const result = await postsService.bulkEdit(
                {
                    action: 'unpublish'
                },
                {
                    filter: 'featured:true',
                    context: {}
                }
            );
            
            // Verify the result
            should(result).have.property('successful', 2);
            should(result).have.property('editIds');
            result.editIds.should.eql(['post1', 'post2']);
            
            // Verify events were emitted synchronously
            // For unpublishing: post.unpublished + post.edited for each post
            eventsEmitStub.calledWith('post.edited').should.be.true();
            eventsEmitStub.calledWith('post.unpublished').should.be.true();
        });
    });
});