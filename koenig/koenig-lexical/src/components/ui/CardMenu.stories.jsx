import React from 'react';

import {
    CardMenu,
    CardMenuSection,
    CardMenuItem,
    CardSnippetItem
} from './CardMenu';

import {ReactComponent as DividerCardIcon} from '../../assets/icons/kg-card-type-divider.svg';
import {ReactComponent as ImageCardIcon} from '../../assets/icons/kg-card-type-image.svg';
import {ReactComponent as SnippetCardIcon} from '../../assets/icons/kg-card-type-snippet.svg';
import {ReactComponent as YoutubeCardIcon} from '../../assets/icons/kg-card-type-youtube.svg';
import {ReactComponent as TwitterCardIcon} from '../../assets/icons/kg-card-type-twitter.svg';

const story = {
    title: 'Card menu/Card menu',
    component: CardMenu,
    subcomponent: {CardMenuSection, CardMenuItem}
};
export default story;

const Template = args => <CardMenu {...args} />;

export const Default = Template.bind({});
Default.args = {
    children: [
        <CardMenuSection label="Primary">
            <CardMenuItem label="Divider" desc="Insert a dividing line" Icon={DividerCardIcon} />
            <CardMenuItem label="Image" desc="Upload, or embed with /image [url]" Icon={ImageCardIcon} />
        </CardMenuSection>,
        <CardMenuSection label="Embed">
            <CardMenuItem label="YouTube" desc="/youtube [video url]" Icon={YoutubeCardIcon} />
            <CardMenuItem label="Twitter" desc="/twitter [tweet url]" Icon={TwitterCardIcon} />
        </CardMenuSection>,
        <CardMenuSection label="Snippets">
            <CardSnippetItem label="Snippet one" Icon={SnippetCardIcon} />
            <CardSnippetItem label="Snippet two" Icon={SnippetCardIcon} />
        </CardMenuSection>
    ]
};
