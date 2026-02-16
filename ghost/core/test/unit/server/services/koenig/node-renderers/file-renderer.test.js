const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/file-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            src: '/content/files/2023/03/IMG_0196.jpeg',
            fileTitle: 'Cool image to download',
            fileSize: 123456,
            fileCaption: 'This is a description',
            fileName: 'IMG_0196.jpeg',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('file', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('file', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-file-card">
                    <a class="kg-file-card-container" href="/content/files/2023/03/IMG_0196.jpeg" title="Download" download="">
                        <div class="kg-file-card-contents">
                            <div class="kg-file-card-title">Cool image to download</div>
                            <div class="kg-file-card-caption">This is a description</div>
                            <div class="kg-file-card-metadata">
                                <div class="kg-file-card-filename">IMG_0196.jpeg</div>
                                <div class="kg-file-card-filesize"></div>
                            </div>
                        </div>
                        <div class="kg-file-card-icon">
                            <svg viewBox="0 0 24 24">
                                <defs>
                                    <style>
                                        .a {
                                            fill: none;
                                            stroke: currentColor;
                                            stroke-linecap: round;
                                            stroke-linejoin: round;
                                            stroke-width: 1.5px;
                                        }
                                    </style>
                                </defs>
                                <title>download-circle</title>
                                <polyline class="a" points="8.25 14.25 12 18 15.75 14.25"></polyline>
                                <line class="a" x1="12" y1="6.75" x2="12" y2="18"></line>
                                <circle class="a" cx="12" cy="12" r="11.25"></circle>
                            </svg>
                        </div>
                    </a>
                </div>
            `);
        });

        it('renders nothing with a missing src', function () {
            const result = renderForWeb(getTestData({src: ''}));
            assert.equal(result.html, '');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <table cellspacing="0" cellpadding="4" border="0" class="kg-file-card" width="100%">
                    <tbody>
                        <tr>
                        <td>
                            <table cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tbody>
                                <tr>
                                <td valign="middle" style="vertical-align: middle">
                                    <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tbody>
                                        <tr>
                                        <td>
                                            <a href="https://test.com/post/" class="kg-file-title">Cool image to download</a>
                                        </td>
                                        </tr>
                                    </tbody>
                                    </table>
                                    <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tbody>
                                        <tr>
                                        <td>
                                            <a href="https://test.com/post/" class="kg-file-description">This is a description</a>
                                        </td>
                                        </tr>
                                    </tbody>
                                    </table>
                                    <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tbody>
                                        <tr>
                                        <td>
                                            <a href="https://test.com/post/" class="kg-file-meta"><span
                                                class="kg-file-name">IMG_0196.jpeg</span>• 121
                                            KB</a>
                                        </td>
                                        </tr>
                                    </tbody>
                                    </table>
                                </td>
                                <td width="80" valign="middle" class="kg-file-thumbnail">
                                    <a href="https://test.com/post/" style="display: block; top: 0; right: 0; bottom: 0; left: 0"><img
                                        src="https://static.ghost.org/v4.0.0/images/download-icon-darkmode.png" style="
                                        margin-top: 6px;
                                        height: 24px;
                                        width: 24px;
                                        max-width: 24px;
                                        " /></a>
                                </td>
                                </tr>
                            </tbody>
                            </table>
                        </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('renders nothing with a missing src', function () {
            const result = renderForEmail(getTestData({src: ''}));
            assert.equal(result.html, '');
        });
    });
});
