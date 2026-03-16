const {
    absoluteToRelative,
    relativeToAbsolute,
    toTransformReady
} = require('@tryghost/url-utils/lib/utils');
const {escapeHtml} = require('@tryghost/string');

function bytesToSize(bytes) {
    if (!bytes) {
        return '0 Byte';
    }
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) {
        return '0 Byte';
    }
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round((bytes / Math.pow(1024, i))) + ' ' + sizes[i];
}

module.exports = {
    name: 'file',
    type: 'dom',

    render({payload, env: {dom}, options = {}}) {
        if (!payload.src) {
            return dom.createTextNode('');
        }

        let classNames = '';
        let emailStyles = {
            icon: 'height: 24px; width: 24px; max-width: 24px; margin-top: 8px;'
        };

        if (!payload.fileTitle && !payload.fileCaption) {
            classNames = 'kg-file-card-small';
            emailStyles.icon = 'margin-top: 6px; height: 20px; width: 20px; max-width: 20px; padding-top: 4px; padding-bottom: 4px;';
        } else if (!payload.fileTitle || !payload.fileCaption) {
            classNames = 'kg-file-card-medium';
            emailStyles.icon = 'margin-top: 6px; height: 24px; width: 24px; max-width: 24px;';
        }

        let html = `
        <div class="kg-card kg-file-card ${classNames}">
            <a class="kg-file-card-container" href="${escapeHtml(payload.src)}" title="Download" download>
                <div class="kg-file-card-contents">
                    ${payload.fileTitle ? `<div class="kg-file-card-title">${escapeHtml(payload.fileTitle)}</div>` : ``}
                    ${payload.fileCaption ? `<div class="kg-file-card-caption">${escapeHtml(payload.fileCaption)}</div>` : ``}
                    <div class="kg-file-card-metadata">
                        <div class="kg-file-card-filename">${escapeHtml(payload.fileName)}</div>
                        <div class="kg-file-card-filesize">${bytesToSize(payload.fileSize)}</div>
                    </div>
                </div>
                <div class="kg-file-card-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><style>.a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5px;}</style></defs><title>download-circle</title><polyline class="a" points="8.25 14.25 12 18 15.75 14.25"/><line class="a" x1="12" y1="6.75" x2="12" y2="18"/><circle class="a" cx="12" cy="12" r="11.25"/></svg>
                </div>
            </a>
        </div>
        `;

        const postUrl = options.postUrl || 'https://ghost.org';

        if (options.target === 'email') {
            html = `
            <table cellspacing="0" cellpadding="4" border="0" class="kg-file-card" width="100%">
                <tr>
                    <td>
                        <table cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td valign="middle" style="vertical-align: middle;">
                                    ${payload.fileTitle ? `
                                    <table cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td>
                                        <a href="${escapeHtml(postUrl)}" class="kg-file-title">${escapeHtml(payload.fileTitle)}</a>
                                    </td></tr></table>
                                    ` : ``}
                                    ${payload.fileCaption ? `
                                    <table cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td>
                                        <a href="${escapeHtml(postUrl)}" class="kg-file-description">${escapeHtml(payload.fileCaption)}</a>
                                    </td></tr></table>
                                    ` : ``}
                                    <table cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td>
                                        <a href="${escapeHtml(postUrl)}" class="kg-file-meta"><span class="kg-file-name">${escapeHtml(payload.fileName)}</span> &bull; ${bytesToSize(payload.fileSize)}</a>
                                    </td></tr></table>
                                </td>
                                <td width="80" valign="middle" class="kg-file-thumbnail">
                                    <a href="${escapeHtml(postUrl)}" style="position: absolute; display: block; top: 0; right: 0; bottom: 0; left: 0;"></a>
                                    <img src="https://static.ghost.org/v4.0.0/images/download-icon-darkmode.png" style="${escapeHtml(emailStyles.icon)}">
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            `;
        }

        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        payload.src = payload.src && absoluteToRelative(payload.src, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.src = payload.src && relativeToAbsolute(payload.src, options.siteUrl, options.itemUrl, options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.src = payload.src && toTransformReady(payload.src, options.siteUrl, options);
        return payload;
    }
};
