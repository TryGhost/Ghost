const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const Renderer = require('../../');

const dom = new JSDOM();

function shouldRender({input, output, options = {}}) {
    return async function () {
        const defaultOnError = (err) => {
            throw err;
        };

        const {nodes, onError, ...renderOptions} = options;
        const renderer = new Renderer({dom, nodes, onError: onError || defaultOnError});
        const renderedInput = await renderer.render(input, renderOptions);
        renderedInput.should.equal(output);
    };
}

module.exports = shouldRender;
