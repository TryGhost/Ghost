import HorizontalRulePlugin from '../plugins/HorizontalRulePlugin';
import HtmlPlugin from './HtmlPlugin';
import ImagePlugin from '../plugins/ImagePlugin';
import KoenigSelectorPlugin from './KoenigSelectorPlugin.jsx';
import MarkdownPlugin from '../plugins/MarkdownPlugin';
import React from 'react';
import {AudioPlugin} from '../plugins/AudioPlugin';
import {BookmarkPlugin} from '../plugins/BookmarkPlugin';
import {ButtonPlugin} from '../plugins/ButtonPlugin';
import {CalloutPlugin} from '../plugins/CalloutPlugin';
import {CardMenuPlugin} from '../plugins/CardMenuPlugin';
import {FilePlugin} from '../plugins/FilePlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {PaywallPlugin} from '../plugins/PaywallPlugin';
import {TabIndentationPlugin} from '@lexical/react/LexicalTabIndentationPlugin';
import {TogglePlugin} from '../plugins/TogglePlugin';
import {VideoPlugin} from '../plugins/VideoPlugin';

export const AllDefaultPlugins = () => {
    return (
        <>
            {/* Lexical Plugins */}
            <ListPlugin /> {/* adds indent/outdent/remove etc support */}
            <TabIndentationPlugin /> {/* tab/shift+tab triggers indent/outdent */}

            {/* Koenig Plugins */}
            <CardMenuPlugin />

            {/* Card Plugins */}
            <AudioPlugin />
            <ImagePlugin />
            <VideoPlugin />
            <MarkdownPlugin />
            <HorizontalRulePlugin />
            <CalloutPlugin />
            <HtmlPlugin />
            <FilePlugin />
            <ButtonPlugin />
            <TogglePlugin />
            <BookmarkPlugin />
            <PaywallPlugin />
            <KoenigSelectorPlugin />
        </>
    );
};

export default AllDefaultPlugins;
