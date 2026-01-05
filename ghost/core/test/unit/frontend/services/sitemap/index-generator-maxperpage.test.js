const should = require('should');
const testUtils = require('../../../../utils');
const IndexGenerator = require('../../../../../core/frontend/services/sitemap/SiteMapIndexGenerator');
const PostGenerator = require('../../../../../core/frontend/services/sitemap/PostMapGenerator');

describe('SiteMapIndexGenerator maxPerPage Bug Fix', function () {
    it('should use resource type maxPerPage for pagination calculation', function () {
        // Create a post generator with default maxPerPage (50000)
        const postGenerator = new PostGenerator();
        
        // Add 10 posts
        for (let i = 0; i < 10; i++) {
            postGenerator.addUrl(
                `http://my-ghost-blog.com/post-${i}/`,
                testUtils.DataGenerator.forKnex.createPost({
                    created_at: Date.UTC(2014, 11, 22, 12) + i,
                    slug: `post-${i}`
                })
            );
        }

        // Create index generator with DIFFERENT maxPerPage (this was the bug scenario)
        // The index generator's maxPerPage should NOT affect the resource type's pagination
        const indexGenerator = new IndexGenerator({
            types: {posts: postGenerator},
            maxPerPage: 5  // Different from postGenerator's 50000!
        });

        const xml = indexGenerator.getXml();
        
        // With the FIX, the index should use postGenerator.maxPerPage (50000)
        // So with 10 posts and maxPerPage 50000, it should only generate 1 page
        xml.should.match(/sitemap-posts\.xml/);
        xml.should.not.match(/sitemap-posts-2\.xml/);

        // Verify the post generator actually only has 1 page
        const page1 = postGenerator.getXml(1);
        const page2 = postGenerator.getXml(2);
        
        should.exist(page1);
        should.not.exist(page2); // Page 2 should be empty
    });

    it('should correctly paginate with 54743 posts (real world scenario)', function () {
        // Simulate the exact bug report scenario
        const postGenerator = new PostGenerator({maxPerPage: 50000});
        
        // Add 54743 posts (same as laineygossip.com)
        for (let i = 0; i < 54743; i++) {
            const post = testUtils.DataGenerator.forKnex.createPost({
                created_at: Date.UTC(2014, 11, 22, 12) + i,
                slug: `post-${i}`
            });
            // Directly add to nodeLookup to avoid performance issues
            postGenerator.nodeLookup[post.id] = {
                url: [
                    {loc: `http://laineygossip.com/post-${i}/`},
                    {lastmod: new Date(post.created_at).toISOString()}
                ]
            };
            postGenerator.nodeTimeLookup[post.id] = new Date(post.created_at);
        }

        const indexGenerator = new IndexGenerator({
            types: {posts: postGenerator},
            maxPerPage: 50000
        });

        const xml = indexGenerator.getXml();
        
        // Should have exactly 2 pages (54743 / 50000 = 1.09486, ceil = 2)
        xml.should.match(/sitemap-posts\.xml/);
        xml.should.match(/sitemap-posts-2\.xml/);
        xml.should.not.match(/sitemap-posts-3\.xml/);

        // Verify both pages can be served
        const page1 = postGenerator.getXml(1);
        const page2 = postGenerator.getXml(2);
        
        should.exist(page1, 'Page 1 should exist');
        should.exist(page2, 'Page 2 should exist (this was returning 404)');
        
        // Verify page counts
        page1.match(/<loc>/g).length.should.eql(50000);
        page2.match(/<loc>/g).length.should.eql(4743);
    });

    it('should handle mixed maxPerPage values across resource types', function () {
        const postGenerator = new PostGenerator({maxPerPage: 5});
        const pageGenerator = new (require('../../../../../core/frontend/services/sitemap/PageMapGenerator'))({maxPerPage: 3});
        
        // Add 10 posts
        for (let i = 0; i < 10; i++) {
            postGenerator.addUrl(
                `http://test.com/post-${i}/`,
                testUtils.DataGenerator.forKnex.createPost({
                    created_at: Date.UTC(2014, 11, 22, 12) + i,
                    slug: `post-${i}`
                })
            );
        }

        // Add 10 pages
        for (let i = 0; i < 10; i++) {
            pageGenerator.addUrl(
                `http://test.com/page-${i}/`,
                {id: `page-${i}`, staticRoute: false}
            );
        }

        const indexGenerator = new IndexGenerator({
            types: {posts: postGenerator, pages: pageGenerator},
            maxPerPage: 50000  // Different from both resource types!
        });

        const xml = indexGenerator.getXml();
        
        // Posts: 10 / 5 = 2 pages
        xml.should.match(/sitemap-posts\.xml/);
        xml.should.match(/sitemap-posts-2\.xml/);
        
        // Pages: 10 / 3 = 3.33, ceil = 4 pages
        xml.should.match(/sitemap-pages\.xml/);
        xml.should.match(/sitemap-pages-2\.xml/);
        xml.should.match(/sitemap-pages-3\.xml/);
        xml.should.match(/sitemap-pages-4\.xml/);
    });
});
