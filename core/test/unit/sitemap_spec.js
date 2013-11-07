/*
 use `npm test` to run tests using mocha
 */

var Sitemap = require('../../server/helpers/sitemap')
    should = require('should');

describe('Sitemap helper', function() {

    it('should work with an empty site', function() {
        var sitemap = new Sitemap()
            xml = sitemap.xml();

        xml.should.be.a.String;
        xml.should.eql('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"></urlset>');
    });


    it('should work with simple items', function() {
        var sitemap = new Sitemap(),
            xml;

        sitemap.item({ loc: 'http://example.com' });
        xml = sitemap.xml();

        xml.should.be.a.String;
        xml.should.eql('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"><url><loc>http://example.com</loc></url></urlset>');

        sitemap.item({ loc: 'http://example.com/sample' });
        xml = sitemap.xml();

        xml.should.be.a.String;
        xml.should.eql('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"><url><loc>http://example.com</loc></url><url><loc>http://example.com/sample</loc></url></urlset>');
    });


    it('should work with advanced items', function() {
        var sitemap = new Sitemap(),
            xml;

        sitemap.item({
            loc: 'http://example.com',
            lastmod: '2000-01-01 12:00:00 GMT',
            changefreq: 'hourly',
            priority: '0.5'
        });
        xml = sitemap.xml();

        xml.should.be.a.String;
        xml.should.eql('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"><url><loc>http://example.com</loc><lastmod>2000-01-01T12:00:00.000Z</lastmod><changefreq>hourly</changefreq><priority>0.5</priority></url></urlset>');

        sitemap.item({
            loc: 'http://example.com/sample',
            lastmod: '2012-05-01 12:00:00 GMT',
            changefreq: 'always',
            priority: '0.8'
        });
        xml = sitemap.xml();

        xml.should.be.a.String;
        xml.should.eql('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"><url><loc>http://example.com</loc><lastmod>2000-01-01T12:00:00.000Z</lastmod><changefreq>hourly</changefreq><priority>0.5</priority></url><url><loc>http://example.com/sample</loc><lastmod>2012-05-01T12:00:00.000Z</lastmod><changefreq>always</changefreq><priority>0.8</priority></url></urlset>');
    });

});

