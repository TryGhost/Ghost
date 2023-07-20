const Renderer = require('../../');

function shouldRender({input, output, options}) {
    return async function () {
        const renderer = new Renderer();
        const renderedInput = await renderer.render(input, options);
        renderedInput.should.equal(output);
    };
}

module.exports = shouldRender;
