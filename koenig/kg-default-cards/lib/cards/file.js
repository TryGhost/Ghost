const {
    absoluteToRelative,
    relativeToAbsolute,
    toTransformReady
} = require('@tryghost/url-utils/lib/utils');

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

        let classNames;
        if (!payload.fileTitle && !payload.fileCaption) {
            classNames = 'kg-file-card-small';
        } else if (!payload.fileTitle || !payload.fileCaption) {
            classNames = 'kg-file-card-medium';
        }
        
        let html = `
        <a class="kg-card kg-file-card ${classNames}" href="${payload.src}">
            <div class="kg-file-card-container">
                ${payload.fileTitle ? `<div class="kg-file-card-title">${payload.fileTitle}</div>` : ``}
                ${payload.fileCaption ? `<div class="kg-file-card-caption">${payload.fileCaption}</div>` : ``}
                <div class="kg-file-card-metadata">
                    <div class="kg-file-card-filename">${payload.fileName}</div>
                    <div class="kg-file-card-filesize">${bytesToSize(payload.fileSize)}</div>
                </div>
            </div>
            <div class="kg-file-card-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><style>.a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5px;}</style></defs><title>download-circle</title><polyline class="a" points="8.25 14.25 12 18 15.75 14.25"/><line class="a" x1="12" y1="6.75" x2="12" y2="18"/><circle class="a" cx="12" cy="12" r="11.25"/></svg>
            </div>
        </a>
        `;

        if (options.target === 'email') {
            html = `Email file`;
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
