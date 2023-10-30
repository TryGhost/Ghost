const {JSDOM} = require('jsdom');
const Renderer = require('../../');

function shouldRender({input, output, options = {}}) {
    return async function () {
        const defaultRenderOptions = {
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
        const {nodes, ...renderOptions} = options;
        const renderer = new Renderer({nodes});
        const renderedInput = await renderer.render(input, {...defaultRenderOptions, ...renderOptions});
        renderedInput.should.equal(output);
    };
}

module.exports = shouldRender;
