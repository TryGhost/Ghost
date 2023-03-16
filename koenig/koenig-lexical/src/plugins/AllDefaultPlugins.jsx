import HorizontalRulePlugin from '../plugins/HorizontalRulePlugin';
import HtmlPlugin from './HtmlPlugin';
import ImagePlugin from '../plugins/ImagePlugin';
import MarkdownPlugin from '../plugins/MarkdownPlugin';
import React from 'react';
import {AudioPlugin} from '../plugins/AudioPlugin';
import {CardMenuPlugin} from '../plugins/CardMenuPlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {TabIndentationPlugin} from '@lexical/react/LexicalTabIndentationPlugin';
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
            <HtmlPlugin />
        </>
    );
};

export default AllDefaultPlugins;
