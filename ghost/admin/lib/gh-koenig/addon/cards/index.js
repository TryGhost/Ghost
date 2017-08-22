import hrCard from 'gh-koenig/cards/card-hr_dom';
import htmlCard from 'gh-koenig/cards/card-html_dom';
import imageCard from 'gh-koenig/cards/card-image_dom';
import markdownCard from 'gh-koenig/cards/card-markdown_dom';

let cards = [];

[htmlCard, imageCard, markdownCard, hrCard].forEach((_card) => {
    _card.type = 'dom';
    cards.push(_card);
});

export default cards;
