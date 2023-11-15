const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const Renderer = require('../../');

const dom = new JSDOM();

function shouldRender({input, output, options = {}}) {
    return async function () {
        const {nodes, ...renderOptions} = options;
        const renderer = new Renderer({dom, nodes});
        const renderedInput = await renderer.render(input, renderOptions);
        renderedInput.should.equal(output);
    };
}

module.exports = shouldRender;
