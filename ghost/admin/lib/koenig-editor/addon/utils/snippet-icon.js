export default function snippetIcon(snippet) {
    let {mobiledoc} = snippet;

    if (mobiledoc.cards.length === 0) {
        return 'koenig/kg-card-type-snippet-text';
    }

    let hasRichText = mobiledoc.sections.some((section) => {
        return section[0] !== 10;
    });

    if (hasRichText) {
        return 'koenig/kg-card-type-snippet-combination';
    }

    return 'koenig/kg-card-type-snippet-block';
}
