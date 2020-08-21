const Handlebars = require('handlebars');
const {
    absoluteToRelative,
    relativeToAbsolute,
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute
} = require('@tryghost/url-utils/lib/utils');

/**
<figure class="kg-card kg-bookmark-card">
  <a href="[URL]" class="kg-bookmark-container">
    <div class="kg-bookmark-content">
      <div class="kg-bookmark-title">[TITLE]</div>
      <div class="kg-bookmark-description">[DESCRIPTION]</div>
      <div class="kg-bookmark-metadata">
        <img src="[ICON]" class="kg-bookmark-icon">
        <span class="kg-bookmark-author">[AUTHOR]</span>
        <span class="kg-bookmark-publisher">[PUBLISHER]</span>
      </div>
    </div>
    <div class="kg-bookmark-thumbnail">
      <img src="[THUMBNAIL]">
    </div>
  </a>
</figure>
 */

function hbs(literals, ...values) {
    // interweave strings with substitutions
    let output = '';
    for (let i = 0; i < values.length; i++) {
        output += literals[i] + values[i];
    }
    output += literals[values.length];

    // return compiled handlebars template
    return Handlebars.compile(output);
}

function dedent(str) {
    let lines = str.split(/\n/);
    return lines.map(line => line.replace(/^\s+/gm, '')).join('').trim();
}

let template;

module.exports = {
    name: 'bookmark',
    type: 'dom',

    render({payload, env: {dom}}) {
        if (!payload.metadata || !payload.url || !payload.metadata.title) {
            return dom.createTextNode('');
        }

        if (!template) {
            template = hbs`
                <figure class="kg-card kg-bookmark-card{{#if caption}} kg-card-hascaption{{/if}}">
                    <a class="kg-bookmark-container" href="{{url}}">
                        <div class="kg-bookmark-content">
                            <div class="kg-bookmark-title">{{metadata.title}}</div>
                            <div class="kg-bookmark-description">{{metadata.description}}</div>
                            <div class="kg-bookmark-metadata">
                                {{#if metadata.icon}}<img class="kg-bookmark-icon" src="{{metadata.icon}}">{{/if}}
                                {{#if metadata.author}}<span class="kg-bookmark-author">{{metadata.author}}</span>{{/if}}
                                {{#if metadata.publisher}}<span class="kg-bookmark-publisher">{{metadata.publisher}}</span>{{/if}}
                            </div>
                        </div>
                        {{#if metadata.thumbnail}}
                            <div class="kg-bookmark-thumbnail">
                                <img src="{{metadata.thumbnail}}">
                            </div>
                        {{/if}}
                    </a>
                    {{#if caption}}
                        <figcaption>{{caption}}</figcaption>
                    {{/if}}
                </figure>
            `;
        }

        return dom.createRawHTMLSection(dedent(template(payload)));
    },

    absoluteToRelative(payload, options) {
        if (payload.url) {
            payload.url = payload.url && absoluteToRelative(payload.url, options.siteUrl, options);
        }
        if (payload.metadata && payload.metadata.url) {
            payload.metadata.url = payload.metadata.url && absoluteToRelative(payload.metadata.url, options.siteUrl, options);
        }
        payload.caption = payload.caption && htmlAbsoluteToRelative(payload.caption, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        if (payload.url) {
            payload.url = payload.url && relativeToAbsolute(payload.url, options.siteUrl, options.itemUrl, options);
        }
        if (payload.metadata && payload.metadata.url) {
            payload.metadata.url = payload.metadata.url && relativeToAbsolute(payload.metadata.url, options.siteUrl, options.itemUrl, options);
        }
        payload.caption = payload.caption && htmlRelativeToAbsolute(payload.caption, options.siteUrl, options.itemUrl, options);
        return payload;
    }
};
