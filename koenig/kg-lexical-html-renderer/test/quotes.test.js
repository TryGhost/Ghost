const {shouldRender} = require('./utils');
const {AsideNode, ExtendedQuoteNode} = require('@tryghost/kg-default-nodes');

describe('Quotes', function () {
    it('quote', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Blockquote with ","type":"text","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"formatting","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"quote","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<blockquote>Blockquote with <strong>formatting</strong></blockquote>`
    }));

    it('extended-quote', shouldRender({
        options: {nodes: [ExtendedQuoteNode]},
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Blockquote with ","type":"text","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"formatting","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"extended-quote","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<blockquote>Blockquote with <strong>formatting</strong></blockquote>`
    }));

    it('big quote', shouldRender({
        options: {nodes: [AsideNode]},
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Aside with ","type":"text","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"formatting","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"aside","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<blockquote class="kg-blockquote-alt">Aside with <strong>formatting</strong></blockquote>`
    }));

    describe('email target', function () {
        it('forces inner p', shouldRender({
            input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Blockquote with ","type":"text","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"formatting","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"quote","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
            output: `<blockquote><p>Blockquote with <strong>formatting</strong></p></blockquote>`,
            options: {target: 'email'}
        }));

        // at time of writing our denest transform pulls the p content to top-level in blockquote
        // so this test is a bit redundant _but_ we expect to allow paragraphs in blockquotes in
        // the future so this is here to ensure we don't have a regression
        it('does not create double p', shouldRender({
            input: `{"root":{"children":[{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Blockquote with ","type":"text","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"formatting","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"quote","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
            output: `<blockquote><p>Blockquote with <strong>formatting</strong></p></blockquote>`,
            options: {target: 'email'}
        }));
    });
});
