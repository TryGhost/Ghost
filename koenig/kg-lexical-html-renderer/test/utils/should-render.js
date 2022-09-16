const Renderer = require('../../');

function shouldRender({input, output}) {
    return function () {
        const renderer = new Renderer();
        renderer.render(input).should.equal(output);
    };
}

module.exports = shouldRender;
