const {shouldRender} = require('./utils');

describe('Headings', function () {
    it('h1-h6', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Heading 1","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h1"},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Heading 2","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h2"},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Heading 3","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h3"},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Heading 4","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h4"},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Heading 5","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h5"},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Heading 6","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h6"}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<h1 id="heading-1">Heading 1</h1>
<h2 id="heading-2">Heading 2</h2>
<h3 id="heading-3">Heading 3</h3>
<h4 id="heading-4">Heading 4</h4>
<h5 id="heading-5">Heading 5</h5>
<h6 id="heading-6">Heading 6</h6>`
    }));

    it('containing text formats', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Text with ","type":"text","version":1},{"detail":0,"format":2,"mode":"normal","style":"","text":"emphasis","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h1"}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<h1 id="text-with-emphasis">Text with <em>emphasis</em></h1>`
    }));

    it('duplicate headings', shouldRender({
        input: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"heading one","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h1"},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"heading one","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h1"},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"heading two","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h1"},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"heading one","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h1"},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"heading two","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h1"}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
        output: `<h1 id="heading-one">heading one</h1>
<h1 id="heading-one-1">heading one</h1>
<h1 id="heading-two">heading two</h1>
<h1 id="heading-one-2">heading one</h1>
<h1 id="heading-two-1">heading two</h1>`
    }));
});
