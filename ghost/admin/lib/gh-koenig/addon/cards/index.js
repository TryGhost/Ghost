import htmlCard from 'gh-koenig/cards/html-card_dom';
import imageCard from 'gh-koenig/cards/image-card_dom';
import markdownCard from 'gh-koenig/cards/markdown-card_dom';

let cards = [];

[htmlCard, imageCard, markdownCard].forEach(_card => {
        _card.type = 'dom';
        cards.push(_card);
});

export default cards;
