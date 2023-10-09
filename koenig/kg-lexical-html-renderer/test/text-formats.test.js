const {shouldRender} = require('./utils');

describe('Basic formats', function () {
    it('bold', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"Strong","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><strong>Strong</strong></p>`
    }));

    it('italic', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":2,"mode":"normal","style":"","text":"Italic","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><em>Italic</em></p>`
    }));

    it('strikethrough', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":4,"mode":"normal","style":"","text":"Strikethrough","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><s>Strikethrough</s></p>`
    }));

    it('underline', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":8,"mode":"normal","style":"","text":"Underline","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><u>Underline</u></p>`
    }));

    it('code', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":16,"mode":"normal","style":"","text":"Code","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><code>Code</code></p>`
    }));

    it('subscript', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":32,"mode":"normal","style":"","text":"Subscript","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><sub>Subscript</sub></p>`
    }));

    it('superscript', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":64,"mode":"normal","style":"","text":"Superscript","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><sup>Superscript</sup></p>`
    }));
});

describe('Format combinations', function () {
    it('plain bold', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Plain ","type":"text","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"Strong","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p>Plain <strong>Strong</strong></p>`
    }));

    it('plain bold plain', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Plain ","type":"text","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"Strong","type":"text","version":1},{"detail":0,"format":0,"mode":"normal","style":"","text":" Plain","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p>Plain <strong>Strong</strong> Plain</p>`
    }));

    it('bold plain', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"Strong","type":"text","version":1},{"detail":0,"format":0,"mode":"normal","style":"","text":" Plain","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><strong>Strong</strong> Plain</p>`
    }));

    it('bold+italic', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"Strong ","type":"text","version":1},{"detail":0,"format":3,"mode":"normal","style":"","text":"Italic","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><strong>Strong <em>Italic</em></strong></p>`
    }));

    it('italic+bold', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":2,"mode":"normal","style":"","text":"Italic ","type":"text","version":1},{"detail":0,"format":3,"mode":"normal","style":"","text":"Strong","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><em>Italic <strong>Strong</strong></em></p>`
    }));

    it('bold+italic+bold', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"Strong ","type":"text","version":1},{"detail":0,"format":3,"mode":"normal","style":"","text":"Italic","type":"text","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":" Strong","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><strong>Strong <em>Italic</em> Strong</strong></p>`
    }));

    it('italic+bold+italic', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":2,"mode":"normal","style":"","text":"Italic ","type":"text","version":1},{"detail":0,"format":3,"mode":"normal","style":"","text":"Strong","type":"text","version":1},{"detail":0,"format":2,"mode":"normal","style":"","text":" Italic","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><em>Italic <strong>Strong</strong> Italic</em></p>`
    }));
});

describe('Formats with linebreaks', function () {
    it('bold br bold', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"First bold","type":"text","version":1},{"type":"linebreak","version":1},{"detail":0,"format":1,"mode":"normal","style":"","text":"Second bold","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><strong>First bold<br>Second bold</strong></p>`
    }));

    it('bold br italic', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"First bold","type":"text","version":1},{"type":"linebreak","version":1},{"detail":0,"format":2,"mode":"normal","style":"","text":"Second italic","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><strong>First bold</strong><br><em>Second italic</em></p>`
    }));

    it('bold br bold+italic', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"First bold","type":"text","version":1},{"type":"linebreak","version":1},{"detail":0,"format":3,"mode":"normal","style":"","text":"Second bold+italic","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<p><strong>First bold<br><em>Second bold+italic</em></strong></p>`
    }));
});
