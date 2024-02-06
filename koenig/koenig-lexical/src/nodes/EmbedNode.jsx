import CodePenIcon from '../assets/icons/kg-card-type-codepen.svg?react';
import EmbedCardIcon from '../assets/icons/kg-card-type-other.svg?react';
import React from 'react';
import SoundCloudIcon from '../assets/icons/kg-card-type-soundcloud.svg?react';
import SpotifyIcon from '../assets/icons/kg-card-type-spotify.svg?react';
import VimeoIcon from '../assets/icons/kg-card-type-vimeo.svg?react';
import XIcon from '../assets/icons/kg-card-type-x.svg?react';
import YouTubeIcon from '../assets/icons/kg-card-type-youtube.svg?react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {$generateHtmlFromNodes} from '@lexical/html';
import {EmbedNode as BaseEmbedNode} from '@tryghost/kg-default-nodes';
import {EmbedNodeComponent} from './EmbedNodeComponent';
import {KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_EMBED_COMMAND = createCommand();

export class EmbedNode extends BaseEmbedNode {
    __captionEditor;
    __captionEditorInitialState;
    __createdWithUrl;

    static kgMenu = [{
        section: 'Embeds',
        label: 'Other...',
        desc: '/embed [url]',
        Icon: EmbedCardIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        matches: ['embed'],
        queryParams: ['url'],
        priority: 100,
        shortcut: '/embed [url]'
    },
    {
        section: 'Embeds',
        label: 'YouTube',
        desc: '/youtube [video url]',
        Icon: YouTubeIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        queryParams: ['url'],
        matches: ['youtube'],
        priority: 1,
        shortcut: '/youtube [url]'
    },
    {
        section: 'Embeds',
        label: 'X (formerly Twitter)',
        desc: '/twitter [tweet url]',
        Icon: XIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        queryParams: ['url'],
        matches: ['twitter', 'x'],
        priority: 2,
        shortcut: '/twitter [url]'
    },
    {
        section: 'Embeds',
        label: 'Vimeo',
        desc: '/vimeo [video url]',
        Icon: VimeoIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        queryParams: ['url'],
        matches: ['vimeo'],
        priority: 4,
        shortcut: '/vimeo [url]'
    },
    {
        section: 'Embeds',
        label: 'CodePen',
        desc: '/codepen [pen url]',
        Icon: CodePenIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        queryParams: ['url'],
        matches: ['codepen'],
        priority: 5,
        shortcut: '/codepen [url]'
    },
    {
        section: 'Embeds',
        label: 'Spotify',
        desc: '/spotify [track or playlist url]',
        Icon: SpotifyIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        queryParams: ['url'],
        matches: ['spotify'],
        priority: 6,
        shortcut: '/spotify [url]'
    },
    {
        section: 'Embeds',
        label: 'SoundCloud',
        desc: '/soundcloud [track or playlist url]',
        Icon: SoundCloudIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        queryParams: ['url'],
        matches: ['soundcloud'],
        priority: 7,
        shortcut: '/soundcloud [url]'
    }];

    getIcon() {
        return EmbedCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        this.__createdWithUrl = !!dataset.url && !dataset.html;

        setupNestedEditor(this, '__captionEditor', {editor: dataset.captionEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        if (!dataset.captionEditor && dataset.caption) {
            populateNestedEditor(this, '__captionEditor', `${dataset.caption}`); // we serialize with no wrapper
        }
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.captionEditor = self.__captionEditor;
        dataset.captionEditorInitialState = self.__captionEditorInitialState;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because their content may not
        // be automatically updated when the nested editor changes
        if (this.__captionEditor) {
            this.__captionEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__captionEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.caption = cleanedHtml;
            });
        }

        return json;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <EmbedNodeComponent
                    captionEditor={this.__captionEditor}
                    captionEditorInitialState={this.__captionEditorInitialState}
                    createdWithUrl={this.__createdWithUrl}
                    embedType={this.embedType}
                    html={this.html}
                    metadata={this.metadata}
                    nodeKey={this.getKey()}
                    url={this.url}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createEmbedNode = (dataset) => {
    return new EmbedNode(dataset);
};

export function $isEmbedNode(node) {
    return node instanceof EmbedNode;
}
