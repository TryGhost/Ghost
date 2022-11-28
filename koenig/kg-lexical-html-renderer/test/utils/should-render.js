const Renderer = require('../../');

function shouldRender({input, output, options}) {
    return function () {
        const renderer = new Renderer();
        renderer.render(input, options).should.equal(output);
    };
}

module.exports = shouldRender;
