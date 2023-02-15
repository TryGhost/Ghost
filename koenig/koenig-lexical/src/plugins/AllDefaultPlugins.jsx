import React from 'react';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {TabIndentationPlugin} from '@lexical/react/LexicalTabIndentationPlugin';
import {CardMenuPlugin} from '../plugins/CardMenuPlugin';
import ImagePlugin from '../plugins/ImagePlugin';
import MarkdownPlugin from '../plugins/MarkdownPlugin';

import HorizontalRulePlugin from '../plugins/HorizontalRulePlugin';
import {AudioPlugin} from '../plugins/AudioPlugin';
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
        </>
    );
};

export default AllDefaultPlugins;
