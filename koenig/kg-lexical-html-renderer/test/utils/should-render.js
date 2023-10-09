const Renderer = require('../../');

function shouldRender({input, output, options = {}}) {
    return async function () {
        const {nodes, ...renderOptions} = options;
        const renderer = new Renderer({nodes});
        const renderedInput = await renderer.render(input, renderOptions);
        renderedInput.should.equal(output);
    };
}

module.exports = shouldRender;
