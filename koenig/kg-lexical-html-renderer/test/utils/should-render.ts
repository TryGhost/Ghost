import {JSDOM} from 'jsdom';
import {LexicalHTMLRenderer as Renderer} from '../../src/index.js';

const dom = new JSDOM();

interface ShouldRenderParams {
    input: string;
    output: string;
    options?: Record<string, unknown>;
}

function shouldRender({input, output, options = {}}: ShouldRenderParams) {
    return async function () {
        const defaultOnError = (err: Error) => {
            throw err;
        };

        const {nodes, onError, ...renderOptions} = options as Record<string, unknown>;
        const renderer = new Renderer({dom, nodes, onError: onError || defaultOnError} as Record<string, unknown>);
        const renderedInput = await renderer.render(input, renderOptions);
        renderedInput.should.equal(output);
    };
}

export default shouldRender;
