const assert = require('node:assert/strict');
const config = require('../../../../../../../../core/shared/config');
const filesSerializer = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/files');

describe('Files output serializer', function () {
    describe('upload', function () {
        it('converts a local relative path to an absolute URL', function () {
            const siteUrl = config.getSiteUrl().replace(/\/$/, '');
            const frame = {data: {ref: null}, response: null};
            filesSerializer.upload({filePath: '/content/files/2026/03/report.pdf'}, {}, frame);

            assert.equal(frame.response.files[0].url, `${siteUrl}/content/files/2026/03/report.pdf`);
        });

        it('passes through a CDN URL unchanged', function () {
            const cdnUrl = 'https://storage.ghost.is/c/6f/a3/site/content/files/2026/03/report.pdf';
            const frame = {data: {ref: null}, response: null};
            filesSerializer.upload({filePath: cdnUrl}, {}, frame);

            assert.equal(frame.response.files[0].url, cdnUrl);
        });

        it('includes ref from frame data', function () {
            const siteUrl = config.getSiteUrl().replace(/\/$/, '');
            const frame = {data: {ref: 'file-ref-123'}, response: null};
            filesSerializer.upload({filePath: '/content/files/2026/03/report.pdf'}, {}, frame);

            assert.equal(frame.response.files[0].url, `${siteUrl}/content/files/2026/03/report.pdf`);
            assert.equal(frame.response.files[0].ref, 'file-ref-123');
        });
    });
});
