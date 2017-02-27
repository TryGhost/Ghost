import htmlCard from 'ghost-editor/cards/html-card_dom';
import imageCard from 'ghost-editor/cards/image-card_dom';
import markdownCard from 'ghost-editor/cards/markdown-card_dom';

let cards = [];

[htmlCard, imageCard, markdownCard].forEach(_card => {
        _card.type = 'dom';
        cards.push(_card);
});

export default cards;
